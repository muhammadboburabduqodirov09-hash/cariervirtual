import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateDeepSeekQuiz } from "../deepseekApi";
import { Modal, btnPrimary, pill } from "./ui";
import { Brain, Settings2, ShieldCheck, Timer } from "lucide-react";

export default function Quiz({ topic, label, onDone, onClose }) {
  const [data, setData] = useState(null);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState([]);
  const [pick, setPick] = useState(null);
  const [qLeft, setQLeft] = useState(20);
  const [tLeft, setTLeft] = useState(120);
  const done = useRef(false);
  const qs = data?.questions;

  useEffect(() => {
    let on = true;
    generateDeepSeekQuiz(topic).then((d) => on && setData(d));
    return () => { on = false; };
  }, [topic]);

  useEffect(() => {
    if (!data || done.current) return;
    const t = setInterval(() => {
      setQLeft((s) => Math.max(0, s - 1));
      setTLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [data]);

  const finish = (a) => {
    if (done.current) return;
    done.current = true;
    onDone(qs.filter((q, k) => a[k] === q.answer).length);
  };
  const next = () => {
    const a = [...ans, pick];
    if (i + 1 >= qs.length) return finish(a);
    setAns(a); setI(i + 1); setPick(null); setQLeft(20);
  };
  useEffect(() => {
    if (!qs || done.current) return;
    if (tLeft <= 0) {
      finish([...ans, pick]);
      return;
    }
    if (qLeft <= 0) next();
  }, [qLeft, tLeft, qs, pick, ans]);

  const t = Math.max(tLeft, 0);
  return (
    <Modal wide>
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 font-display text-2xl tracking-tight"><Brain size={22} /> {label}</span>
        <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-full bg-slate-100 text-slate-500 font-extrabold hover:bg-slate-200 active:scale-90 transition">✕</button>
      </div>
      {!qs ? (
        <div className="py-10 text-center">
          <motion.div className="inline-block text-4xl text-indigo-500" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}><Settings2 size={38} /></motion.div>
          <p className="font-bold mt-3 text-slate-600">Writing your scenario…</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className={`${pill} bg-sky-50 text-sky-700`}>Question {i + 1} of 3</span>
            <span className={`${pill} flex items-center gap-1 ${tLeft <= 20 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}><Timer size={13} /> {Math.floor(t / 60)}:{String(t % 60).padStart(2, "0")} left</span>
            <span className={`${pill} flex items-center gap-1 bg-violet-50 text-violet-700`}><ShieldCheck size={13} /> {data.source === "deepseek" ? "DeepSeek AI" : "Offline set"}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${qLeft <= 5 ? "bg-rose-400" : "bg-sky-400"}`} style={{ width: `${(Math.max(qLeft, 0) / 20) * 100}%` }} />
          </div>
          <p className="text-xs font-bold text-slate-400 mt-1.5">Reading time: {Math.max(qLeft, 0)}s</p>
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} transition={{ duration: 0.2 }}>
              <h3 className="font-display text-2xl leading-tight tracking-tight my-4">{qs[i].q}</h3>
              <div className="grid gap-2.5">
                {qs[i].options.map((o, k) => (
                  <motion.button key={k} whileTap={{ scale: 0.98 }} onClick={() => setPick(k)}
                    className={`text-left flex gap-3 items-center font-bold rounded-2xl px-4 py-3 border transition-all duration-150 ${
                      pick === k
                        ? "bg-indigo-50 border-indigo-300 ring-4 ring-indigo-100"
                        : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40"
                    }`}>
                    <span className={`w-8 h-8 shrink-0 grid place-items-center rounded-xl font-display text-sm ${pick === k ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"}`}>{"ABCD"[k]}</span>
                    {o}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          <button className={`${btnPrimary} w-full mt-5`} disabled={pick === null} onClick={next}>
            {i + 1 >= qs.length ? "Submit test" : "Lock answer"}
          </button>
        </>
      )}
    </Modal>
  );
}
