import { useMemo, useState } from 'preact/hooks';
import { ACCENT_COLOURS } from '../../brand/palette';
import { ACCENTS, type Accent } from '../../lib/catalog';
import { ARRANGEMENT_LABEL } from '../../lib/kolam/arrangement';
import { kolam } from '../../lib/kolam/kolam';
import { kolamSvg } from '../../lib/kolam/svg';

/**
 * Type any word and get its kolam: the same function that draws every bag in the shop, running in the
 * browser. The download is built from numbers and fixed markup; the word itself never enters the file.
 */
const MAX_LENGTH = 40;

export default function KolamGenerator() {
  const [word, setWord] = useState('Nore');
  const [accent, setAccent] = useState<Accent>('red-earth');
  const seed = word.trim() === '' ? 'nore' : word;
  const figure = useMemo(() => kolam(seed), [seed]);
  const name =
    seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kolam';

  const download = () => {
    const svg = kolamSvg(figure, { colour: ACCENT_COLOURS[accent].hex, background: '#f4eadb' });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `kolam-${name}.svg`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <div class={`generator accent-${accent}`}>
      <div class="generator__controls">
        <label class="field">
          <span class="field__label">Any word</span>
          <input
            class="input generator__input"
            value={word}
            maxLength={MAX_LENGTH}
            autoComplete="off"
            spellcheck={false}
            onInput={(event) => {
              setWord(event.currentTarget.value);
            }}
          />
          <span class="field__hint">
            Your name, your street, your dog. The same word always gives the same kolam.
          </span>
        </label>
        <fieldset class="generator__swatches">
          <legend class="field__label">Accent</legend>
          {ACCENTS.map((option) => (
            <label key={option} class={`swatch accent-${option}`}>
              <input
                type="radio"
                name="accent"
                value={option}
                checked={accent === option}
                onChange={() => {
                  setAccent(option);
                }}
              />
              <span class="swatch__chip" aria-hidden="true" />
              <span class="swatch__name">{ACCENT_COLOURS[option].name}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" class="button" onClick={download}>
          Download the SVG
        </button>
      </div>
      <figure class="generator__figure">
        <svg viewBox={figure.viewBox} role="img" aria-label={`The kolam for “${seed}”`}>
          <g
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            {figure.paths.map((path) => (
              <path key={path} d={path} />
            ))}
          </g>
          <g fill="currentColor">
            {figure.dots.map((dot) => (
              <circle key={`${String(dot.x)},${String(dot.y)}`} cx={dot.x} cy={dot.y} r={1.9} />
            ))}
          </g>
        </svg>
        <figcaption class="generator__caption">
          {ARRANGEMENT_LABEL[figure.arrangement]}
          {' · '}
          {figure.paths.length === 1 ? 'one unbroken line' : `${String(figure.paths.length)} loops`}
        </figcaption>
      </figure>
    </div>
  );
}
