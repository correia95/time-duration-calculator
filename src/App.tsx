import { useEffect, useMemo, useState } from 'react';
import {
  TapeItem,
  breakdown,
  clockDuration,
  humanDuration,
  parseClock,
  sumTape,
  timeBetween,
} from './duration.ts';

let seq = 0;
const uid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

type Mode = 'add' | 'between';

function readMode(): Mode {
  try {
    return new URLSearchParams(window.location.search).get('m') === 'between' ? 'between' : 'add';
  } catch {
    return 'add';
  }
}

const fmt1 = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US');

export default function App() {
  const [mode, setMode] = useState<Mode>(readMode);

  const [items, setItems] = useState<TapeItem[]>([
    { id: uid(), sign: 1, text: '1h 30m' },
    { id: uid(), sign: 1, text: '45m' },
  ]);
  const [start, setStart] = useState('9:00');
  const [end, setEnd] = useState('17:30');
  const [overnight, setOvernight] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('m', mode);
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [mode]);

  const tape = useMemo(() => sumTape(items), [items]);

  const between = useMemo(() => {
    const a = parseClock(start);
    const b = parseClock(end);
    if (!a.ok || !b.ok) return { ok: false as const, aOk: a.ok, bOk: b.ok };
    return { ok: true as const, seconds: timeBetween(a.seconds, b.seconds, overnight), aOk: true, bOk: true };
  }, [start, end, overnight]);

  const totalSeconds = mode === 'add' ? tape.seconds : between.ok ? between.seconds : 0;
  const valid = mode === 'add' ? !tape.anyError : between.ok;
  const bd = breakdown(totalSeconds);

  const setItem = (id: string, patch: Partial<TapeItem>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addItem = () => setItems((xs) => [...xs, { id: uid(), sign: 1, text: '' }]);
  const rmItem = (id: string) => setItems((xs) => (xs.length > 1 ? xs.filter((x) => x.id !== id) : xs));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Time Duration Calculator</h1>
        <p className="tag">
          Add and subtract lengths of time — <code>1h 30m</code>, <code>2:15</code>,{' '}
          <code>90 min</code>, <code>1.5h</code> — or work out how long it is between two clock times.
        </p>
      </header>

      <div className="seg">
        <button className={mode === 'add' ? 'on' : ''} onClick={() => setMode('add')}>
          Add / subtract
        </button>
        <button className={mode === 'between' ? 'on' : ''} onClick={() => setMode('between')}>
          Between two times
        </button>
      </div>

      {mode === 'add' ? (
        <div className="tape">
          {items.map((it, i) => {
            const row = tape.rows[i];
            const bad = row && !row.ok;
            return (
              <div className={`trow${bad ? ' bad' : ''}`} key={it.id}>
                <button
                  className="sign"
                  onClick={() => setItem(it.id, { sign: it.sign === 1 ? -1 : 1 })}
                  aria-label={it.sign === 1 ? 'Change to minus' : 'Change to plus'}
                >
                  {it.sign === 1 ? '+' : '−'}
                </button>
                <input
                  type="text"
                  value={it.text}
                  placeholder="e.g. 1h 30m"
                  onChange={(e) => setItem(it.id, { text: e.target.value })}
                />
                <button
                  className="x"
                  onClick={() => rmItem(it.id)}
                  disabled={items.length < 2}
                  aria-label="Remove row"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button className="add" onClick={addItem}>
            + Add a duration
          </button>
        </div>
      ) : (
        <div className="between">
          <label className="f">
            <span>Start</span>
            <input
              type="text"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={between.aOk ? '' : 'bad'}
              placeholder="9:00 or 9:00 am"
            />
          </label>
          <label className="f">
            <span>End</span>
            <input
              type="text"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={between.bOk ? '' : 'bad'}
              placeholder="17:30 or 5:30 pm"
            />
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={overnight}
              onChange={(e) => setOvernight(e.target.checked)}
            />
            end time is the next day
          </label>
        </div>
      )}

      <div className={`result${valid ? '' : ' invalid'}`}>
        {valid ? (
          <>
            <strong>{humanDuration(totalSeconds)}</strong>
            <span className="clock">{clockDuration(totalSeconds)}</span>
            <dl className="units">
              <div>
                <dt>Hours</dt>
                <dd>{fmt1(bd.hours)}</dd>
              </div>
              <div>
                <dt>Minutes</dt>
                <dd>{fmt1(bd.minutes)}</dd>
              </div>
              <div>
                <dt>Seconds</dt>
                <dd>{bd.seconds.toLocaleString('en-US')}</dd>
              </div>
              <div>
                <dt>Days</dt>
                <dd>{fmt1(bd.days)}</dd>
              </div>
            </dl>
            <button className="share" onClick={share}>
              {copied ? 'Link copied' : 'Copy link to this calculator'}
            </button>
          </>
        ) : (
          <p className="err">
            {mode === 'add'
              ? 'One of the rows isn’t a time I recognise. Try formats like 1h 30m, 2:15 or 90m.'
              : 'Enter both times as 24-hour (14:30) or with am / pm (2:30 pm).'}
          </p>
        )}
      </div>

      <section className="explainer">
        <h2>What formats can I type?</h2>
        <p>
          For durations: <code>1:30</code> and <code>1:30:00</code> (hours:minutes:seconds),{' '}
          <code>1h 30m</code>, <code>90m</code>, <code>1.5h</code>, <code>2d 4h</code>, or a plain
          number, which is read as minutes. For clock times: 24-hour like <code>14:30</code>, or{' '}
          <code>2:30 pm</code>.
        </p>
        <h3>Adding and subtracting</h3>
        <p>
          Each row has a <b>+</b> or <b>−</b> toggle, so you can total a set of task times and take
          off a break, or find the gap between two elapsed readings. The result can go negative.
        </p>
        <h3>Between two times</h3>
        <p>
          This gives the elapsed time from start to end. If the end is earlier in the day than the
          start, it is assumed to be the following day — useful for shifts that run past midnight.
          Tick the box to force a next-day end even when the times are equal (a full 24 hours).
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. It is arithmetic in your browser. Only the chosen mode is stored, in the page link.</p>
        <footer>Time Duration Calculator · no sign-up · works offline once loaded</footer>
      </section>
    </div>
  );
}
