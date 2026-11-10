import Link from "next/link";

import { gitConfig } from "@/lib/shared";
import registry from "@/registry.json";

/* Software. Palette forest-pale-lime gives the developer tool a dark reading
   surface and one clear action color. Instrument Sans / DM Mono; sharp radius;
   split hero; nav-centre; footer-dark; close-type; dark-band; solid buttons;
   text wordmark; sage ground. Counter-rolls was redealt because the brief has
   no proof figures. Letters-assemble joins the words "Component source" in the
   installation section. Hero entrance establishes reading order. Hover and
   pointer-down feedback identify actions. No shader or continuous loop competes
   with the live composer. The library stays isolated in its own route group. */
export default function HomePage() {
  return (
    <>
      <header className="nav nav--centre">
        <div className="wrap nav__bar">
          <Link className="skip-link" href="#top" prefetch={false}>
            Skip to content
          </Link>
          <Link className="nav__logo" href="/" prefetch={false}>
            ComposerKit
          </Link>
          <nav className="nav__links" aria-label="Main navigation">
            <Link className="nav__link" href="#components" prefetch={false}>
              Components
            </Link>
            <Link className="nav__link" href="#source" prefetch={false}>
              Source
            </Link>
            <Link className="nav__link" href="/gallery" prefetch={false}>
              Gallery
            </Link>
            <Link className="nav__link" href="/docs/theme" prefetch={false}>
              Themes
            </Link>
          </nav>
          <div className="nav__actions">
            <Link className="btn btn--primary" href="/docs" prefetch={false}>
              Read the docs
            </Link>
          </div>
          <button
            className="nav__toggle"
            type="button"
            aria-expanded="false"
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3 6h14M3 14h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </header>
      <main id="top">
        <section
          className="hero hero--split"
          data-enter
          aria-labelledby="hero-h"
        >
          <div className="wrap">
            <div className="hero-text hero__grid grid">
              <div className="hero__text span-5">
                <h1 id="hero-h">ComposerKit for React chat interfaces</h1>
                <p className="hero__lead">
                  Build message composers and conversations with components you
                  can inspect. Add the source through the shadcn registry and
                  connect your own backend.
                </p>
                <div className="btn-row">
                  <Link
                    className="btn btn--primary"
                    href="/docs"
                    prefetch={false}
                  >
                    Read the docs
                  </Link>
                  <Link
                    className="btn btn--secondary"
                    href="/gallery/composer"
                    prefetch={false}
                  >
                    Try the composer
                  </Link>
                </div>
                <p className="hero__fact">
                  {registry.items.length} registry items. Install the parts your
                  chat needs.
                </p>
              </div>
              <div
                className="hero__media span-6 app-frame start-7"
                data-enter-media
              >
                <iframe
                  src="/preview/composer"
                  title="Try the ComposerKit message composer"
                  className="composer-frame"
                />
              </div>
            </div>
          </div>
        </section>
        <section
          className="section"
          id="components"
          aria-labelledby="components-h"
        >
          <div className="wrap">
            <div className="section-head">
              <h2 id="components-h">Components for the conversation</h2>
              <p className="measure">
                Start with the message box, then add the parts your chat needs.
                Each component has a live preview, installation instructions and
                TypeScript props.
              </p>
            </div>
            <div className="component-tour">
              <div className="component-index">
                <Link
                  href="/docs/components/composer"
                  className="component-row"
                  prefetch={false}
                >
                  <span className="component-name">Write a message</span>
                  <span>Composers, attachments and keyboard shortcuts</span>
                </Link>
                <Link
                  href="/docs/components/conversation-view"
                  className="component-row"
                  prefetch={false}
                >
                  <span className="component-name">Read a conversation</span>
                  <span>Messages, code blocks and replies</span>
                </Link>
                <Link
                  href="/docs/components/tool-call"
                  className="component-row"
                  prefetch={false}
                >
                  <span className="component-name">Show tool activity</span>
                  <span>Tool calls and approvals beside the conversation</span>
                </Link>
                <Link
                  href="/docs/theme"
                  className="component-row"
                  prefetch={false}
                >
                  <span className="component-name">Adjust the appearance</span>
                  <span>Light and dark themes for your components</span>
                </Link>
              </div>
              <div className="app-frame conversation-frame">
                <iframe
                  src="/gallery/conversation-view"
                  title="ComposerKit conversation with code and replies"
                  loading="lazy"
                />
              </div>
            </div>
            <Link className="link" href="/gallery" prefetch={false}>
              See the gallery
            </Link>
          </div>
        </section>
        <section
          className="section ground-inverse"
          id="source"
          data-moment="letters-assemble"
          aria-labelledby="source-h"
        >
          <div className="wrap">
            <h2 id="source-h" className="mo-la__type">
              Component source
            </h2>
            <div className="source-details">
              <p>
                Use the shadcn registry to install the API shown in these docs.
                Each component page includes its demo source and exported types.
              </p>
              <div>
                <p>
                  ComposerKit provides the interface. You choose the model,
                  store the messages and handle the requests on your backend.
                </p>
                <Link
                  className="link"
                  href="/docs/components/composer#install"
                  prefetch={false}
                >
                  Read installation instructions
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer
        className="footer closing footer--dark ground-inverse"
        id="start"
        aria-labelledby="close-h"
      >
        <div className="wrap">
          <div className="closing__cta close--type">
            <div className="section-head">
              <h2 id="close-h">Add your first composer</h2>
              <p>
                Follow the quickstart to render a message box in a Next.js app.
              </p>
            </div>
            <Link
              className="btn btn--primary btn--xl btn--wide"
              href="/docs"
              prefetch={false}
            >
              Read the docs
            </Link>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-6">
                <Link className="nav__logo" href="/" prefetch={false}>
                  ComposerKit
                </Link>
                <p className="footer__lede">
                  React components for chat interfaces.
                </p>
              </div>
              <div className="span-3 footer__col">
                <h3>Build</h3>
                <ul>
                  <li>
                    <Link href="/docs" prefetch={false}>
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link href="/gallery" prefetch={false}>
                      Gallery
                    </Link>
                  </li>
                  <li>
                    <Link href="/docs/theme" prefetch={false}>
                      Theme editor
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="span-3 footer__col">
                <h3>Source</h3>
                <ul>
                  <li>
                    <Link
                      href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
                      prefetch={false}
                    >
                      GitHub
                    </Link>
                  </li>
                  <li>
                    <Link href="/llms.txt" prefetch={false}>
                      Markdown for agents
                    </Link>
                  </li>
                  <li>
                    <Link href="/preferences" prefetch={false}>
                      Preferences
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="footer__legal">
              <span>ComposerKit</span>
              <span>Components, demos and documentation</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
