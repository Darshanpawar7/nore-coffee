import { useEffect, useRef, useState } from 'preact/hooks';
import {
  DRIP_MINUTES,
  filterRecipe,
  MAX_CUPS,
  MIN_CUPS,
  STRENGTHS,
  type Strength,
} from '../../lib/brew';

/**
 * South Indian filter coffee, worked out for the cups and strength chosen, with a drip timer. The
 * timer counts from real time (not from ticks), so it stays right if the tab sleeps. It finishes
 * silently: a full ring and a polite announcement, never a sound.
 */

const LONGEST = DRIP_MINUTES.longest * 60;
const SHORTEST = DRIP_MINUTES.shortest * 60;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`;
}

function Timer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const started = useRef(0);
  const before = useRef(0);
  const announced = useRef({ shortest: false, longest: false });

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => {
      const now = before.current + (Date.now() - started.current) / 1000;
      setElapsed(Math.min(LONGEST, now));
      if (now >= SHORTEST && !announced.current.shortest) {
        announced.current.shortest = true;
        setMessage(
          'Twelve minutes. Lift the lid: if the top chamber is empty, the decoction is ready.',
        );
      }
      if (now >= LONGEST) {
        announced.current.longest = true;
        setMessage('Fifteen minutes. The decoction is ready: time for the milk.');
        setRunning(false);
      }
    }, 250);
    return () => {
      window.clearInterval(id);
    };
  }, [running]);

  const start = () => {
    if (elapsed >= LONGEST) reset();
    started.current = Date.now();
    before.current = elapsed >= LONGEST ? 0 : elapsed;
    setRunning(true);
    setMessage(
      `Timer running. The decoction takes ${String(DRIP_MINUTES.shortest)} to ${String(DRIP_MINUTES.longest)} minutes.`,
    );
  };

  const pause = () => {
    setRunning(false);
    setMessage(`Paused at ${clock(elapsed)}.`);
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    before.current = 0;
    announced.current = { shortest: false, longest: false };
    setMessage('Timer reset.');
  };

  const done = elapsed >= LONGEST;
  const ready = elapsed >= SHORTEST;
  const shortestAngle = (SHORTEST / LONGEST) * 2 * Math.PI - Math.PI / 2;

  return (
    <div class={`timer${done ? ' is-done' : ready ? ' is-ready' : ''}`}>
      <svg viewBox="0 0 140 140" class="timer__ring" aria-hidden="true">
        <circle cx="70" cy="70" r={RADIUS} class="timer__track" />
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          class="timer__fill"
          stroke-dasharray={CIRCUMFERENCE}
          stroke-dashoffset={CIRCUMFERENCE * (1 - elapsed / LONGEST)}
          transform="rotate(-90 70 70)"
        />
        <line
          x1={70 + (RADIUS - 9) * Math.cos(shortestAngle)}
          y1={70 + (RADIUS - 9) * Math.sin(shortestAngle)}
          x2={70 + (RADIUS + 9) * Math.cos(shortestAngle)}
          y2={70 + (RADIUS + 9) * Math.sin(shortestAngle)}
          class="timer__mark"
        />
        <text x="70" y="68" text-anchor="middle" class="timer__time">
          {clock(elapsed)}
        </text>
        <text x="70" y="88" text-anchor="middle" class="timer__label">
          {done ? 'Ready' : ready ? 'Nearly' : 'of 15:00'}
        </text>
      </svg>
      <div class="timer__controls">
        {running ? (
          <button type="button" class="button button--ghost" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" class="button" onClick={start}>
            {elapsed > 0 && !done ? 'Resume' : 'Start the drip timer'}
          </button>
        )}
        <button
          type="button"
          class="button button--ghost"
          onClick={reset}
          disabled={elapsed === 0 && !running}
        >
          Reset
        </button>
      </div>
      <p class="timer__message" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

export default function BrewGuide() {
  const [cups, setCups] = useState(2);
  const [strength, setStrength] = useState<Strength>('classic');
  const recipe = filterRecipe(cups, strength);

  return (
    <div class="brew">
      <div class="brew__controls">
        <div class="field">
          <span class="field__label" id="cups-label">
            Cups
          </span>
          <div class="quantity" role="group" aria-labelledby="cups-label">
            <button
              type="button"
              class="stepper"
              aria-label="One cup fewer"
              disabled={cups <= MIN_CUPS}
              onClick={() => {
                setCups(cups - 1);
              }}
            >
              −
            </button>
            <output class="quantity__value" aria-live="polite">
              {cups}
            </output>
            <button
              type="button"
              class="stepper"
              aria-label="One cup more"
              disabled={cups >= MAX_CUPS}
              onClick={() => {
                setCups(cups + 1);
              }}
            >
              +
            </button>
          </div>
        </div>
        <fieldset class="filters__group brew__strength">
          <legend>Strength</legend>
          {(Object.keys(STRENGTHS) as Strength[]).map((option) => (
            <label key={option} class="chip">
              <input
                type="radio"
                name="strength"
                value={option}
                checked={strength === option}
                onChange={() => {
                  setStrength(option);
                }}
              />
              {STRENGTHS[option].label}, 1:{STRENGTHS[option].milkParts}
            </label>
          ))}
        </fieldset>
      </div>

      <dl class="brew__numbers" aria-live="polite">
        <div>
          <dt>Filter coffee powder</dt>
          <dd>{recipe.powder} g</dd>
        </div>
        <div>
          <dt>Water, just off the boil</dt>
          <dd>{recipe.water} ml</dd>
        </div>
        <div>
          <dt>Decoction you will get</dt>
          <dd>about {recipe.decoction} ml</dd>
        </div>
        <div>
          <dt>Hot milk</dt>
          <dd>{recipe.milk} ml</dd>
        </div>
      </dl>

      <ol class="brew__steps serif">
        <li>
          Put {recipe.powder} g of filter grind in the top chamber and rest the umbrella disc on it.
          Do not press hard: the water has to find its way through.
        </li>
        <li>
          Pour {recipe.water} ml of water just off the boil over the disc, and put the lid on.
        </li>
        <li>
          Leave it to drip for {DRIP_MINUTES.shortest} to {DRIP_MINUTES.longest} minutes. Start the
          timer and go and brush your teeth.
        </li>
        <li>
          Heat {recipe.milk} ml of milk until it froths at the edge. Pour about {recipe.decoction}{' '}
          ml of decoction into the tumbler, one part to {recipe.milkParts} of milk, and sugar if you
          like.
        </li>
        <li>
          Pull it three or four times between tumbler and davara for the nore, and drink it while it
          is hot.
        </li>
      </ol>

      <Timer />
      <p class="field__hint">
        These numbers are a starting point. Every household’s davara has its own opinion.
      </p>
    </div>
  );
}
