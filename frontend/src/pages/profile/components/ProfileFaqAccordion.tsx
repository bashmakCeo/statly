import { useState } from "react";

import { PROFILE_FAQ_ITEMS } from "../profileFaqItems";

export function ProfileFaqAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={isOpen ? "profile-page__faq profile-page__faq--open" : "profile-page__faq"}>
      <button
        aria-expanded={isOpen}
        className="profile-page__faq-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>FAQ</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen ? (
        <div className="profile-page__faq-content">
          {PROFILE_FAQ_ITEMS.map((item) => (
            <article className="profile-page__faq-item" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={
        isOpen
          ? "profile-page__chevron profile-page__chevron--open"
          : "profile-page__chevron"
      }
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
