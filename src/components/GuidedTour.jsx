import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

export const tourSteps = (role) => role === "parent" ? [
  { target: '[data-tour="account"]', title: "Your account & settings", text: "Open your account menu to sign out, or Settings to choose a theme, dark mode, and profile photo." },
  { target: '[data-tour="overview"]', title: "Your family at a glance", text: "See your child’s career, approved earnings, and how much of the monthly reward budget is committed." },
  { target: '[data-tour="tasks"]', title: "Create meaningful tasks", text: "Add a career or growth task, set a reward and optional due date, then post it for your child." },
  { target: '[data-tour="approvals"]', title: "Review and approve", text: "When your child completes a task and passes its quiz, review the work here. Approving releases their virtual reward." },
] : [
  { target: '[data-tour="account"]', title: "Your account & settings", text: "Open your account menu to sign out, or Settings to choose a theme, dark mode, and profile photo." },
  { target: '[data-tour="overview"]', title: "Track your progress", text: "Your wallet, level, and savings progress update as you complete approved work." },
  { target: '[data-tour="tasks"]', title: "How to earn rewards", text: "Choose a task your parent assigned, finish it, and pass its skill quiz (at least 2 answers correct). Your parent reviews it; once approved, your virtual reward is added to your wallet." },
  { target: '[data-tour="goals"]', title: "Save for something you want", text: "Create a savings goal and watch your balance grow. Each approved reward is split between spending, savings, and virtual tax." },
];

export default function GuidedTour({ role, step, onNext, onBack, onClose }) {
  const steps = useMemo(() => tourSteps(role), [role]);
  const [rect, setRect] = useState(null);
  const current = steps[step];

  useEffect(() => {
    if (!current) return undefined;
    let target;
    const findTarget = () => {
      target = [...document.querySelectorAll(current.target)].find((element) => element.getClientRects().length);
      if (!target) {
        setRect(null);
        return;
      }
      const bounds = target.getBoundingClientRect();
      setRect({ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height, centerX: bounds.left + bounds.width / 2, centerY: bounds.top + bounds.height / 2 });
    };
    findTarget();
    window.addEventListener("resize", findTarget);
    window.addEventListener("scroll", findTarget, true);
    return () => {
      window.removeEventListener("resize", findTarget);
      window.removeEventListener("scroll", findTarget, true);
    };
  }, [current]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && step < steps.length - 1) onNext();
      if (event.key === "ArrowLeft" && step > 0) onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack, onClose, onNext, step, steps.length]);

  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-shade" />
      {rect && <>
        <div className="tour-spotlight" style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }} />
        <svg className="tour-arrow" aria-hidden="true">
          <defs><marker id="tour-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="currentColor" /></marker></defs>
          <line x1={window.innerWidth / 2} y1={window.innerHeight - (window.innerWidth <= 680 ? 280 : 165)} x2={rect.centerX} y2={rect.centerY} markerEnd="url(#tour-arrowhead)" />
        </svg>
      </>}
      <section className="tour-card">
        <div className="tour-card-top"><span className="tour-count">STEP {step + 1} OF {steps.length}</span><button onClick={onClose} aria-label="Close tour"><X size={17} /></button></div>
        <h2 id="tour-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="tour-card-bottom">
          <div className="tour-dots">{steps.map((tourStep, index) => <i key={tourStep.title} className={index === step ? "active" : ""} />)}</div>
          <div className="tour-controls">
            {step > 0 && <button className="tour-back" onClick={onBack}><ArrowLeft size={15} /> Back</button>}
            <button className="tour-next" onClick={onNext}>{step === steps.length - 1 ? "Finish tour" : "Next"}{step < steps.length - 1 && <ArrowRight size={15} />}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
