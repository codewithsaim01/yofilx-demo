/* Yoflix Nova — static site script.
   Part 1: the theme's original interactions (theme.js): header, menu, reveals, counters, FAQs, filters, plans.
   Part 2: static-site layer: forms and the demo assistant, replacing the Laravel endpoints. */

document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const desktop = window.matchMedia('(min-width: 1025px)');
    const previewTheme = document.body.dataset.previewTheme;

    // Keep admins inside the theme they are previewing.
    if (previewTheme) {
        document.querySelectorAll('a[href]').forEach((link) => {
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin || url.hash || url.pathname.startsWith('/admin')) return;
            if (!url.searchParams.has('theme')) url.searchParams.set('theme', previewTheme);
            link.href = url.toString();
        });
    }

    /* ---------- Split headings into masked words ---------- */
    const splitWords = (root) => {
        let index = 0;
        const walk = (node) => {
            [...node.childNodes].forEach((child) => {
                if (child.nodeType === Node.ELEMENT_NODE) { walk(child); return; }
                if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) return;
                const fragment = document.createDocumentFragment();
                child.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(' ')); return; }
                    const outer = document.createElement('span');
                    const inner = document.createElement('span');
                    outer.className = 'nova-w';
                    inner.style.setProperty('--i', String(index++));
                    inner.textContent = part;
                    outer.append(inner);
                    fragment.append(outer);
                });
                child.replaceWith(fragment);
            });
        };
        root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
        walk(root);
        [...root.children].forEach((child) => child.setAttribute('aria-hidden', 'true'));
    };
    if (!reduceMotion) {
        document.querySelectorAll('[data-split]').forEach(splitWords);
        document.querySelector('.nova-mh-title, .nova-page-hero h1')?.style.setProperty('--split-delay', '250ms');
    }

    /* ---------- Reveal on scroll ---------- */
    const revealTargets = [...document.querySelectorAll('[data-reveal], [data-split]')];
    const reveal = (target) => target.classList.add('is-visible');
    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealTargets.forEach(reveal);
    } else {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
                reveal(entry.target);
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
        revealTargets.forEach((target) => observer.observe(target));
    }

    /* ---------- Pricing: Monthly / Yearly switch ---------- */
    document.querySelectorAll('[data-plan-billing]').forEach((section) => {
        const buttons = [...section.querySelectorAll('[data-plan-period]')];
        buttons.forEach((button) => button.addEventListener('click', () => {
            const period = button.dataset.planPeriod;
            section.dataset.planBilling = period;
            buttons.forEach((other) => {
                other.classList.toggle('is-active', other === button);
                other.setAttribute('aria-pressed', String(other === button));
            });
            // Plans without a yearly price keep showing their monthly price.
            section.querySelectorAll('.nova-plan-amount').forEach((amount) => {
                const hasPeriod = amount.querySelector(`[data-plan-price="${period}"]`);
                amount.querySelectorAll('[data-plan-price]').forEach((price) => {
                    price.hidden = hasPeriod ? price.dataset.planPrice !== period : price.dataset.planPrice !== 'monthly';
                });
            });
        }));
    });

    /* ---------- Count up headline figures once they scroll into view ---------- */
    // Only plain numbers with an optional suffix ("28+", "3,135+", "100%", "3×") animate; anything else
    // ("24/7") is left alone, and the final text is always restored exactly as authored.
    const counters = [...document.querySelectorAll('.nova-why-stat, .nova-gl-stats b')]
        .map((element) => ({ element, text: element.textContent.trim(), match: element.textContent.trim().match(/^(\d{1,3}(?:,\d{3})*|\d+)(\D{0,2})$/) }))
        .filter((counter) => counter.match);
    if (!reduceMotion && counters.length && 'IntersectionObserver' in window) {
        const run = ({ element, text, match }) => {
            const target = Number(match[1].replace(/,/g, ''));
            const grouped = match[1].includes(',');
            const started = performance.now();
            const tick = (now) => {
                const progress = Math.min(1, (now - started) / 1400);
                const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
                element.textContent = progress < 1 ? (grouped ? value.toLocaleString('en-US') : value) + match[2] : text;
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };
        const countObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                countObserver.unobserve(entry.target);
                run(counters.find((counter) => counter.element === entry.target));
            });
        }, { threshold: 0.6 });
        counters.forEach((counter) => countObserver.observe(counter.element));
    }

    /* ---------- Header: elevation, hide on scroll down, menus ---------- */
    const header = document.querySelector('.theme-rexxsol-nova [data-nova-header]');
    const mobileMenu = header?.querySelector('[data-nova-menu]');
    const groups = header ? [...header.querySelectorAll('.nova-nav-group')] : [];
    const parallaxItems = reduceMotion ? [] : [...document.querySelectorAll('[data-parallax]')];
    let lastY = window.scrollY;
    let frame = 0;

    const onFrame = () => {
        frame = 0;
        const y = window.scrollY;
        if (header) {
            header.classList.toggle('is-scrolled', y > 8);
            const menuOpen = mobileMenu?.open || groups.some((group) => group.open);
            if (!menuOpen && y > 240 && y > lastY + 4) header.classList.add('is-hidden');
            else if (y < lastY - 4 || y <= 240) header.classList.remove('is-hidden');
        }
        lastY = y;
        if (parallaxItems.length && desktop.matches) {
            const middle = window.innerHeight / 2;
            parallaxItems.forEach((item) => {
                const box = (item.parentElement || item).getBoundingClientRect();
                if (box.bottom < -200 || box.top > window.innerHeight + 200) return;
                const offset = (box.top + box.height / 2 - middle) * parseFloat(item.dataset.parallax || '0');
                item.style.translate = `0 ${offset.toFixed(1)}px`;
            });
        }
    };
    const requestFrame = () => { if (!frame) frame = window.requestAnimationFrame(onFrame); };
    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', requestFrame, { passive: true });
    desktop.addEventListener('change', () => {
        if (!desktop.matches) parallaxItems.forEach((item) => { item.style.translate = ''; });
        if (desktop.matches && mobileMenu) mobileMenu.open = false;
        requestFrame();
    });
    onFrame();

    groups.forEach((group) => {
        const summary = group.querySelector(':scope > summary');
        const sync = () => summary?.setAttribute('aria-expanded', String(group.open));
        group.addEventListener('toggle', sync);
        group.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse' && desktop.matches) group.open = true; });
        group.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse' && desktop.matches && !group.contains(document.activeElement)) group.open = false; });
        group.addEventListener('focusout', (event) => { if (!group.contains(event.relatedTarget)) group.open = false; });
        sync();
    });

    if (mobileMenu) {
        const summary = mobileMenu.querySelector(':scope > summary');
        const sync = () => {
            summary?.setAttribute('aria-expanded', String(mobileMenu.open));
            summary?.setAttribute('aria-label', mobileMenu.open ? 'Close navigation menu' : 'Open navigation menu');
            document.documentElement.style.overflow = mobileMenu.open ? 'hidden' : '';
            header.classList.remove('is-hidden');
        };
        mobileMenu.addEventListener('toggle', sync);
        sync();
    }

    document.addEventListener('click', (event) => {
        groups.forEach((group) => { if (!group.contains(event.target)) group.open = false; });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const open = groups.find((group) => group.open) || (mobileMenu?.open ? mobileMenu : null);
        if (!open) return;
        open.open = false;
        open.querySelector(':scope > summary')?.focus();
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-nova-back-to-top]')) return;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    /* ---------- Page transitions ---------- */
    const curtain = document.querySelector('.nova-curtain');
    if (curtain && !reduceMotion) {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (link.target && link.target !== '_self') return;
            if (link.hasAttribute('download')) return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname.startsWith('/admin')) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;
            event.preventDefault();
            if (mobileMenu) mobileMenu.open = false;
            curtain.classList.add('is-active');
            window.setTimeout(() => { window.location.href = url.href; }, 360);
        });
        window.addEventListener('pageshow', (event) => { if (event.persisted) curtain.classList.remove('is-active'); });
    }

    /* ---------- Magnetic buttons & project cursor (fine pointers only) ---------- */
    if (finePointer && !reduceMotion) {
        document.querySelectorAll('[data-magnetic]').forEach((element) => {
            element.style.transition = 'translate .6s cubic-bezier(.22, 1, .36, 1)';
            element.addEventListener('pointermove', (event) => {
                const box = element.getBoundingClientRect();
                const x = (event.clientX - box.left - box.width / 2) * 0.18;
                const y = (event.clientY - box.top - box.height / 2) * 0.3;
                element.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
            });
            element.addEventListener('pointerleave', () => { element.style.translate = ''; });
        });

        const cursor = document.querySelector('[data-nova-cursor]');
        const label = cursor?.querySelector('span');
        if (cursor && document.querySelector('[data-cursor]')) {
            let x = 0; let y = 0; let cx = 0; let cy = 0; let running = false;
            const follow = () => {
                cx += (x - cx) * 0.2;
                cy += (y - cy) * 0.2;
                cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
                running = Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1;
                if (running) window.requestAnimationFrame(follow);
            };
            window.addEventListener('pointermove', (event) => {
                x = event.clientX; y = event.clientY;
                if (!running) { running = true; window.requestAnimationFrame(follow); }
            }, { passive: true });
            document.addEventListener('pointerover', (event) => {
                const target = event.target.closest('[data-cursor]');
                cursor.classList.toggle('is-active', Boolean(target));
                if (target && label) label.textContent = target.dataset.cursor;
            });
        }
    }

    /* ---------- Services page filter tabs ---------- */
    const serviceFilter = document.querySelector('[data-service-filter]');
    const serviceGrid = document.querySelector('[data-service-grid]');
    if (serviceFilter && serviceGrid) {
        const cards = [...serviceGrid.children];
        const empty = document.querySelector('[data-service-empty]');
        serviceFilter.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-filter]');
            if (!button) return;
            const filter = button.dataset.filter;
            serviceFilter.querySelectorAll('button[data-filter]').forEach((tab) => {
                const active = tab === button;
                tab.classList.toggle('is-active', active);
                tab.setAttribute('aria-pressed', String(active));
            });
            let shown = 0;
            cards.forEach((card) => {
                const match = filter === 'all' || card.dataset.category === filter;
                card.hidden = !match;
                card.classList.remove('is-filtered-in');
                if (match) {
                    shown += 1;
                    card.classList.add('is-visible');
                    if (!reduceMotion) { void card.offsetWidth; card.classList.add('is-filtered-in'); }
                }
            });
            if (empty) empty.hidden = shown > 0;
        });
    }

    /* ---------- Forms ---------- */
    // Phone fields accept digits, spaces and common phone punctuation only.
    document.addEventListener('input', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.matches('[data-phone-number-only]')) return;
        const sanitize = (value) => (value.startsWith('+') ? '+' : '') + value.replace(/[^\d().\s-]/g, '');
        const cursorAt = input.selectionStart ?? input.value.length;
        const sanitizedCursor = sanitize(input.value.slice(0, cursorAt)).length;
        const sanitizedValue = sanitize(input.value);
        if (sanitizedValue !== input.value) {
            input.value = sanitizedValue;
            input.setSelectionRange(sanitizedCursor, sanitizedCursor);
        }
    });

    document.querySelectorAll('.theme-rexxsol-nova [data-contact-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            if (form.dataset.contactSubmitting === 'true') {
                event.preventDefault();
                return;
            }
            form.dataset.contactSubmitting = 'true';
            const button = form.querySelector('[data-contact-submit]');
            if (!button) return;
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            const submitLabel = button.querySelector('[data-contact-submit-label]');
            if (submitLabel) submitLabel.textContent = 'Sending...';
            button.querySelector('[data-contact-submit-icon]')?.setAttribute('hidden', '');
            button.querySelector('[data-contact-submit-spinner]')?.removeAttribute('hidden');
        });
        // Bring server-side feedback into view after a submit round-trip.
        form.querySelector('.nova-alert')?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
});

/* ==========================================================================
   Static-site layer (replaces the Laravel endpoints the theme used to call)
   - Contact + chat inquiry forms: submitted to Netlify Forms when the site is
     hosted on Netlify; anywhere else they explain that and offer email instead.
   - AI chat: a demo assistant that answers from this site's own FAQ and
     Services pages, read in the browser. No API, no backend.
   ========================================================================== */
(() => {
    // The site root, worked out from this script's own URL (assets/js/main.js → ../../).
    const SITE_ROOT = new URL('../../', document.currentScript?.src || window.location.href);

    // Opened straight from disk (file://), a link to "about/" shows the folder listing instead of
    // about/index.html, which web servers serve automatically. Point folder links at index.html there.
    if (window.location.protocol === 'file:') {
        const toIndex = (link) => {
            const href = link.getAttribute('href');
            if (!href || /^([a-z]+:|\/\/|#)/i.test(href)) return;
            const [, path, rest = ''] = href.match(/^([^?#]*)(.*)$/);
            if (path === '' || path.endsWith('/')) link.setAttribute('href', `${path}index.html${rest}`);
        };
        document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('a[href]').forEach(toIndex));
    }

    /* ---------- Global Footprint world map (jsvectormap, loaded when the map nears the viewport) ---------- */
    const loadScript = (path) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(path, SITE_ROOT).href;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
    });
    const readJson = (element, attribute) => {
        try { return JSON.parse(element.getAttribute(attribute) || '[]'); } catch { return []; }
    };
    const mountWorldMaps = () => {
        document.querySelectorAll('[data-nova-world-map]:not([data-mounted])').forEach((element) => {
            element.setAttribute('data-mounted', '');
            const markers = readJson(element, 'data-markers');
            new window.jsVectorMap({
                selector: element,
                map: 'world',
                backgroundColor: 'transparent',
                // A presentational map: no zooming or dragging, and touch gestures are left to page scrolling.
                draggable: false,
                zoomButtons: false,
                zoomOnScroll: false,
                bindTouchEvents: false,
                selectedRegions: readJson(element, 'data-regions'),
                regionStyle: {
                    initial: { fill: '#dbe5f6', stroke: '#ffffff', strokeWidth: 0.6, fillOpacity: 1 },
                    hover: { fill: '#c3d4f4', fillOpacity: 1, cursor: 'default' },
                    selected: { fill: '#1557ff' },
                    selectedHover: { fill: '#0a3fd6' },
                },
                markers,
                markerStyle: {
                    initial: { r: 6, fill: '#0b1f4d', stroke: '#ffffff', strokeWidth: 3, strokeOpacity: 1 },
                    hover: { fill: '#1557ff', cursor: 'pointer' },
                },
                labels: {
                    markers: {
                        render: (marker) => marker.label || marker.name,
                        offsets: (index) => markers[index]?.offset || [10, 0],
                    },
                },
                markerLabelStyle: {
                    initial: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSize: 12, fontWeight: 600, fill: '#0b1f4d' },
                    hover: { fill: '#1557ff', cursor: 'default' },
                },
                lines: readJson(element, 'data-lines'),
                lineStyle: { stroke: '#1557ff', strokeWidth: 1.6, strokeDasharray: '6 6', strokeOpacity: 0.7, animation: true },
            });
        });
    };
    document.addEventListener('DOMContentLoaded', () => {
        const maps = document.querySelectorAll('[data-nova-world-map]');
        if (!maps.length) return;
        let loading = null;
        const load = () => {
            loading ??= loadScript('assets/vendor/jsvectormap/jsvectormap.min.js')
                .then(() => loadScript('assets/vendor/jsvectormap/world.js'))
                .then(mountWorldMaps)
                .catch(() => {});
            return loading;
        };
        if (!('IntersectionObserver' in window)) { load(); return; }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); load(); }
        }, { rootMargin: '400px 0px' });
        maps.forEach((map) => observer.observe(map));
    });
    const pageUrl = (path) => new URL(path, SITE_ROOT).href;
    const contactEmail = () => document.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.replace(/^mailto:/, '') || '';

    // Netlify Forms accepts a urlencoded POST of the form fields plus "form-name" to any page.
    const submitForm = async (form, formName) => {
        const data = new FormData(form);
        data.set('form-name', formName);
        const response = await fetch(SITE_ROOT.pathname, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(data).toString(),
        });
        if (!response.ok) throw new Error(`Form endpoint returned ${response.status}`);
    };
    const fallbackMessage = () => {
        const email = contactEmail();
        return email
            ? `We could not send your message from this page. Please email us at ${email} and our team will get back to you.`
            : 'We could not send your message from this page. Please contact us by phone or email.';
    };

    document.addEventListener('DOMContentLoaded', () => {
        /* ---------- Contact form ---------- */
        const contactForm = document.querySelector('[data-contact-form]');
        if (contactForm) {
            // "Book Consultation" on a plan links here with ?plan=…; keep it as the message subject, as the CMS did.
            const plan = new URLSearchParams(window.location.search).get('plan')?.trim().slice(0, 60);
            if (plan && !contactForm.querySelector('[name="subject"]')) {
                const subject = document.createElement('input');
                subject.type = 'hidden';
                subject.name = 'subject';
                subject.value = `eBay Business Plan: ${plan}`;
                contactForm.append(subject);
            }

            const button = contactForm.querySelector('[data-contact-submit]');
            const label = button?.querySelector('[data-contact-submit-label]');
            const idleLabel = label?.textContent || '';
            const showAlert = (kind, text) => {
                contactForm.querySelector('.nova-alert')?.remove();
                const alert = document.createElement('p');
                alert.className = `nova-alert nova-alert--${kind}`;
                alert.setAttribute('role', kind === 'success' ? 'status' : 'alert');
                alert.tabIndex = -1;
                alert.innerHTML = `<i class="fa-solid fa-${kind === 'success' ? 'check' : 'exclamation'}" aria-hidden="true"></i>`;
                alert.append(document.createTextNode(text));
                contactForm.querySelector('.nova-form-grid')?.before(alert);
                alert.scrollIntoView({ block: 'center', behavior: 'smooth' });
                alert.focus({ preventScroll: true });
            };
            const resetButton = () => {
                contactForm.dataset.contactSubmitting = 'false';
                if (!button) return;
                button.disabled = false;
                button.removeAttribute('aria-busy');
                if (label) label.textContent = idleLabel;
                button.querySelector('[data-contact-submit-icon]')?.removeAttribute('hidden');
                button.querySelector('[data-contact-submit-spinner]')?.setAttribute('hidden', '');
            };

            // theme.js (above) has already switched the button to "Sending..." for this submit.
            contactForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                try {
                    await submitForm(contactForm, 'contact');
                    contactForm.reset();
                    showAlert('success', 'Thank you! Your message has been sent. Our team will get back to you soon.');
                } catch {
                    showAlert('error', fallbackMessage());
                } finally {
                    resetButton();
                }
            });
        }

        /* ---------- AI chat (static demo) ---------- */
        const root = document.querySelector('[data-ai-chat]');
        if (!root) return;

        const config = {
            name: 'YOFLIX Assistant',
            description: 'Online · eBay & marketplace help',
            welcome: "Hi! I'm the YOFLIX Assistant. Ask me about eBay account setup, store management, virtual assistants or our business plans.",
            placeholder: 'Ask about our services…',
            suggestions: ['What services do you offer?', 'Can you help me create an eBay account?', 'Do you support Walmart and TikTok Shop?', 'How do I get started?'],
            contactUrl: pageUrl('contact/'),
        };

        const launcher = root.querySelector('[data-launcher]');
        const panel = root.querySelector('[data-panel]');
        const messages = root.querySelector('[data-messages]');
        const form = root.querySelector('[data-chat-form]');
        const input = root.querySelector('[data-message-input]');
        const send = root.querySelector('[data-send]');
        const error = root.querySelector('[data-error]');
        const status = root.querySelector('[data-status]');
        const suggestions = root.querySelector('[data-suggestions]');
        const leadOpen = root.querySelector('[data-lead-open]');
        const leadForm = root.querySelector('[data-lead-form]');
        const leadError = root.querySelector('[data-lead-error]');
        let busy = false;
        let typing = null;

        const setStatus = (text) => { status.textContent = text; };
        const autoGrow = () => {
            input.style.height = 'auto';
            const max = parseFloat(getComputedStyle(input).maxHeight) || 110;
            input.style.height = `${Math.min(input.scrollHeight, max)}px`;
            input.classList.toggle('is-scrollable', input.scrollHeight > max);
        };
        const scrollMessages = () => { messages.scrollTop = messages.scrollHeight; };
        const appendMessage = (content, role) => {
            const node = document.createElement('p');
            node.className = `nova-chat-message is-${role}`;
            node.textContent = content;
            messages.append(node);
            scrollMessages();
        };
        const appendRelatedLink = (url, text = 'Learn more') => {
            const link = document.createElement('a');
            link.className = 'nova-chat-related';
            link.href = url;
            link.textContent = text;
            messages.append(link);
            scrollMessages();
        };
        const setBusy = (value) => {
            busy = value;
            send.disabled = value;
            input.disabled = value;
            form.setAttribute('aria-busy', value ? 'true' : 'false');
            if (value) {
                typing = document.createElement('p');
                typing.className = 'nova-chat-typing';
                typing.setAttribute('aria-label', 'Assistant is typing');
                typing.innerHTML = '<span></span><span></span><span></span>';
                messages.append(typing);
                setStatus('Assistant is typing');
            } else {
                typing?.remove();
                typing = null;
                setStatus('');
            }
            scrollMessages();
        };

        // Knowledge: the FAQ and Services pages of this site, parsed once on first use.
        let knowledge = null;
        const loadKnowledge = async () => {
            if (knowledge) return knowledge;
            const parse = async (path) => {
                try {
                    const response = await fetch(pageUrl(path));
                    return response.ok ? new DOMParser().parseFromString(await response.text(), 'text/html') : null;
                } catch {
                    return null;
                }
            };
            const [faqsDoc, servicesDoc] = await Promise.all([parse('faqs/'), parse('services/')]);
            const entries = [];
            faqsDoc?.querySelectorAll('[data-faq-item]').forEach((item) => {
                const question = item.querySelector('.nova-faq-question')?.textContent.trim() || '';
                const answer = item.querySelector('.nova-faq-answer p')?.textContent.trim() || '';
                if (question && answer) entries.push({ title: question, text: answer, url: pageUrl(`faqs/#${item.id}`), weight: 1 });
            });
            servicesDoc?.querySelectorAll('.nova-svc-card').forEach((card) => {
                const title = card.querySelector('h2')?.textContent.trim() || '';
                const bullets = [...card.querySelectorAll('.nova-svc-checks li')].map((li) => li.textContent.trim());
                const href = card.querySelector('a')?.getAttribute('href');
                if (title) entries.push({ title, text: `${title} includes: ${bullets.join(', ')}.`, url: href ? new URL(href, pageUrl('services/')).href : pageUrl('services/'), weight: 1.2 });
            });
            knowledge = entries;
            return knowledge;
        };

        const STOP = new Set('a an and are can do does for from have help how i in is it me my of on or our please the to we what which with you your yoflix'.split(' '));
        const words = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word));

        const answerFor = async (question) => {
            const q = question.toLowerCase();
            if (/^(hi|hello|hey|salam|assalam)/.test(q.trim())) {
                return { text: `Hello! ${config.welcome}` };
            }
            if (/(price|pricing|cost|plan|package|fee)/.test(q)) {
                return { text: 'We offer Starter, Growth and Premium eBay business plans. You can compare what each includes on our plans page, and the exact fee is confirmed during a free consultation.', url: pageUrl('ebay-business-plans/'), linkText: 'View plans' };
            }
            if (/(get started|start|book|consult|contact|call|talk)/.test(q)) {
                return { text: 'Getting started is easy: book a free consultation, tell us about your store and goals, and we will recommend the right plan.', url: config.contactUrl, linkText: 'Book a consultation' };
            }
            const entries = await loadKnowledge();
            const asked = words(question);
            let best = null;
            for (const entry of entries) {
                const titleWords = new Set(words(entry.title));
                const textWords = new Set(words(entry.text));
                const score = asked.reduce((total, word) => total + (titleWords.has(word) ? 2 : 0) + (textWords.has(word) ? 1 : 0), 0) * entry.weight;
                if (!best || score > best.score) best = { ...entry, score };
            }
            if (best && best.score >= 2) return { text: best.text, url: best.url };
            return { text: "I don't have a specific answer for that yet. Our team can help — book a free consultation or send us your question.", url: config.contactUrl, linkText: 'Contact our team' };
        };

        const sendMessage = async (text) => {
            const clean = text.trim();
            if (!clean || busy) return;
            appendMessage(clean, 'user');
            input.value = '';
            autoGrow();
            error.hidden = true;
            suggestions.hidden = true;
            setBusy(true);
            const [answer] = await Promise.all([answerFor(clean), new Promise((resolve) => setTimeout(resolve, 650))]);
            setBusy(false);
            appendMessage(answer.text, 'assistant');
            if (answer.url) appendRelatedLink(answer.url, answer.linkText);
            input.focus();
        };

        const showPanel = (open) => {
            panel.hidden = !open;
            root.classList.toggle('is-open', open);
            launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) input.focus();
            else launcher.focus();
        };

        // Same setup the theme did from the CMS config.
        root.style.setProperty('--chat-primary', '#1557FF');
        root.style.setProperty('--chat-accent', '#3B8BFF');
        launcher.hidden = false;
        launcher.setAttribute('aria-label', `Open ${config.name}`);
        root.querySelector('[data-name]').textContent = config.name;
        root.querySelector('[data-description]').textContent = config.description;
        root.querySelector('[data-welcome]').textContent = config.welcome;
        input.placeholder = config.placeholder;
        root.querySelector('[data-contact]').href = config.contactUrl;
        root.querySelector('[data-quotation]').href = config.contactUrl;
        document.querySelectorAll('[data-open-ai-chat]').forEach((button) => {
            button.hidden = false;
            button.addEventListener('click', () => showPanel(true));
        });
        leadOpen.hidden = false;
        suggestions.replaceChildren();
        config.suggestions.forEach((question) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'nova-chat-suggestion';
            button.textContent = question;
            button.addEventListener('click', () => sendMessage(question));
            suggestions.append(button);
        });

        launcher.addEventListener('click', () => showPanel(panel.hidden));
        root.querySelector('[data-close]').addEventListener('click', () => showPanel(false));
        root.querySelector('[data-reset]').addEventListener('click', () => {
            messages.querySelectorAll('.nova-chat-message:not([data-welcome]), .nova-chat-typing, .nova-chat-related').forEach((item) => item.remove());
            suggestions.hidden = false;
            error.hidden = true;
            input.focus();
        });
        form.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(input.value); });
        input.addEventListener('input', autoGrow);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                form.requestSubmit();
            }
        });
        leadOpen.addEventListener('click', () => { leadForm.hidden = false; leadOpen.hidden = true; leadForm.querySelector('[name="name"]').focus(); });
        root.querySelector('[data-lead-cancel]').addEventListener('click', () => { leadForm.reset(); leadForm.hidden = true; leadOpen.hidden = false; });
        leadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            leadError.hidden = true;
            const values = Object.fromEntries(new FormData(leadForm).entries());
            if (!values.email && !values.phone) {
                leadError.textContent = 'Please provide an email address or phone number.';
                leadError.hidden = false;
                return;
            }
            const submit = leadForm.querySelector('[type="submit"]');
            submit.disabled = true;
            try {
                await submitForm(leadForm, 'chat-inquiry');
                leadForm.reset();
                leadForm.hidden = true;
                leadOpen.hidden = false;
                appendMessage('Thank you! Your inquiry has been received. Our team will get back to you soon.', 'assistant');
                setStatus('Inquiry submitted successfully.');
            } catch {
                leadError.textContent = fallbackMessage();
                leadError.hidden = false;
            } finally {
                submit.disabled = false;
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !panel.hidden) showPanel(false);
        });
    });
})();
