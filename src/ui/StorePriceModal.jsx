import { useEffect } from 'react';

import { steamStoreUrl, steamWidgetUrl } from '../source/steamLinks.js';

export default function StorePriceModal({ game, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  if (!game) return null;

  return (
    <div className="price-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="price-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="price-modal-heading">
          <div>
            <p>STEAM STORE · SOUTH KOREA</p>
            <h2 id="price-modal-title">{game.name} 가격·할인</h2>
          </div>
          <button type="button" className="price-modal-close" onClick={onClose} aria-label="가격 창 닫기" autoFocus>
            ×
          </button>
        </header>

        <iframe
          className="steam-price-widget"
          src={steamWidgetUrl(game.appid)}
          title={`${game.name} Steam 한국 가격과 할인 정보`}
          loading="eager"
        />

        <footer className="price-modal-foot">
          <div>
            <p>Steam 공식 상점 위젯이 한국 원화 기준의 현재 구매 옵션을 직접 표시한다.</p>
            <p>에디션이 여러 개면 Steam이 정한 대표 구매 옵션이 표시될 수 있다.</p>
          </div>
          <a href={steamStoreUrl(game.appid)} target="_blank" rel="noreferrer">
            Steam 상점에서 확인 ↗
          </a>
        </footer>
      </section>
    </div>
  );
}
