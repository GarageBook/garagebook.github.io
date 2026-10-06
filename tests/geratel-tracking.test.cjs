const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const attributionScript = fs.readFileSync(path.join(root, 'assets/js/attribution.js'), 'utf8');
const analyticsScript = fs.readFileSync(path.join(root, 'assets/js/analytics-events.js'), 'utf8');
const geratelPage = fs.readFileSync(path.join(root, 'geratel/index.html'), 'utf8');

function browser(pathname, links = [], stored = new Map(), options = {}) {
    const listeners = new Map();
    const hits = [];
    const location = {
        hostname: 'garagebook.nl',
        origin: 'https://garagebook.nl',
        pathname,
        search: options.search || '',
        href: `https://garagebook.nl${pathname}${options.search || ''}`,
        assign(url) { this.navigatedTo = url; },
    };
    const document = {
        title: 'Geratel',
        referrer: options.referrer || '',
        querySelectorAll() { return links; },
        addEventListener(name, callback) { listeners.set(name, callback); },
    };
    const window = {
        location,
        gtag(...args) { hits.push(args); },
        setTimeout(callback) { callback(); },
    };
    const localStorage = {
        getItem(key) { return stored.get(key) ?? null; },
        setItem(key, value) { stored.set(key, value); },
        removeItem(key) { stored.delete(key); },
    };
    const context = vm.createContext({ window, document, localStorage, URL, URLSearchParams, Element, Date });

    return { context, document, hits, links, listeners, location, stored, window };
}

class Element {
    constructor(href) { this.href = href; this.textContent = 'Registreer je GarageBook'; }
    getAttribute(name) { return name === 'href' ? this.href : null; }
    setAttribute(name, value) { if (name === 'href') this.href = value; }
    hasAttribute() { return false; }
    closest(selector) { return selector === 'a[href]' ? this : selector === 'main' ? {} : null; }
}

test('all Geratel registration CTAs carry first-touch attribution and track clicks', () => {
    const hrefs = [...geratelPage.matchAll(/href="(https:\/\/app\.garagebook\.nl\/admin\/register\/geratel)"/g)]
        .map((match) => match[1]);
    const allRegistrationHrefs = [...geratelPage.matchAll(/href="([^"]*\/register[^"]*)"/g)];
    assert.equal(hrefs.length, allRegistrationHrefs.length);
    assert.equal(hrefs.length, 3);

    const links = hrefs.map((href) => new Element(href));
    const page = browser('/geratel/', links);
    vm.runInContext(attributionScript, page.context);
    vm.runInContext(analyticsScript, page.context);
    page.listeners.get('DOMContentLoaded')();

    for (const link of links) {
        const url = new URL(link.href);
        assert.equal(url.pathname, '/admin/register/geratel');
        assert.equal(url.searchParams.get('attr_landing'), '/geratel/');
        assert.equal(url.searchParams.get('source'), 'geratel');
        assert.equal(url.searchParams.get('campaign_slug'), 'geratel');
    }

    page.window.garageBookAnalytics.consentGranted = true;
    page.listeners.get('garagebook:analytics-consent-granted')();
    assert.equal(page.hits.filter((hit) => hit[1] === 'page_view').length, 1);
    assert.equal(page.hits.find((hit) => hit[1] === 'page_view')[2].page_path, '/geratel/');

    page.listeners.get('click')({
        target: links[0],
        button: 0,
        defaultPrevented: false,
        preventDefault() {},
    });
    assert.equal(page.hits.filter((hit) => hit[1] === 'start_click').length, 1);
    assert.equal(new URL(page.location.navigatedTo).searchParams.get('attr_landing'), '/geratel/');
});

test('another first touch remains first touch when the visitor later opens Geratel', () => {
    const stored = new Map();
    const firstPage = browser('/motor-onderhoud-app/', [], stored);
    vm.runInContext(attributionScript, firstPage.context);

    const geratelPage = browser('/geratel/', [], stored);
    vm.runInContext(attributionScript, geratelPage.context);
    const url = geratelPage.window.garageBookAttribution.appendToStartUrl(
        new URL('https://app.garagebook.nl/admin/register/geratel')
    );

    assert.equal(url.searchParams.get('attr_landing'), '/motor-onderhoud-app/');
    assert.equal(url.searchParams.get('campaign_slug'), 'geratel');
    assert.equal(url.searchParams.get('source'), null);
});

test('Geratel CTA still carries its landing page when local storage is unavailable', () => {
    const page = browser('/geratel/');
    page.context.localStorage.getItem = () => { throw new Error('storage blocked'); };
    page.context.localStorage.setItem = () => { throw new Error('storage blocked'); };
    vm.runInContext(attributionScript, page.context);

    const url = page.window.garageBookAttribution.appendToStartUrl(
        new URL('https://app.garagebook.nl/admin/register/geratel')
    );

    assert.equal(url.searchParams.get('attr_landing'), '/geratel/');
    assert.equal(url.searchParams.get('source'), 'geratel');
    assert.equal(url.searchParams.get('campaign_slug'), 'geratel');
});

test('generic registration links carry original UTM values and a private referrer origin', () => {
    const stored = new Map();
    const firstPage = browser('/motor-onderhoud-app/', [], stored, {
        search: '?utm_source=search&utm_medium=cpc&utm_campaign=spring',
        referrer: 'https://search.example/results?email=private@example.com',
    });
    vm.runInContext(attributionScript, firstPage.context);

    const link = new Element('https://app.garagebook.nl/admin/register?utm_source=garagebook.nl&utm_medium=website');
    const laterPage = browser('/blog/', [link], stored);
    vm.runInContext(attributionScript, laterPage.context);
    vm.runInContext(analyticsScript, laterPage.context);
    laterPage.listeners.get('DOMContentLoaded')();

    const url = new URL(link.href);
    assert.equal(url.searchParams.get('attr_landing'), '/motor-onderhoud-app/');
    assert.equal(url.searchParams.get('attr_source'), 'search');
    assert.equal(url.searchParams.get('attr_medium'), 'cpc');
    assert.equal(url.searchParams.get('attr_campaign'), 'spring');
    assert.equal(url.searchParams.get('attr_referrer'), 'https://search.example');
    assert.equal(url.searchParams.get('utm_source'), 'garagebook.nl');
    assert.equal(link.href.includes('private@example.com'), false);
});

test('older stored first-touch referrers are reduced to an origin before forwarding', () => {
    const stored = new Map([['gb_first_touch', JSON.stringify({
        first_source: 'search.example',
        first_medium: 'referral',
        first_referrer: 'https://search.example/results?email=private@example.com',
        first_landing_page: '/motor-onderhoud-app/',
        expires: Date.now() + 60_000,
    })]]);
    const page = browser('/blog/', [], stored);
    vm.runInContext(attributionScript, page.context);

    const url = page.window.garageBookAttribution.appendToStartUrl(
        new URL('https://app.garagebook.nl/admin/register')
    );

    assert.equal(url.searchParams.get('attr_referrer'), 'https://search.example');
    assert.equal(url.toString().includes('private@example.com'), false);
});
