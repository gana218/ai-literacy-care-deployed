import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 7/11: 모든 CSS 리셋과 Tailwind 우선순위를 깨부수고 몽환적인 파스텔 그라데이션(ref-reading) 배경 강제 주입
try {
  document.documentElement.style.setProperty('background', 'linear-gradient(135deg, #FDE6E6 0%, #E6E9FE 50%, #DAC4FA 100%) fixed', 'important');
  document.body.style.setProperty('background', 'linear-gradient(135deg, #FDE6E6 0%, #E6E9FE 50%, #DAC4FA 100%) fixed', 'important');
} catch (e) {
  console.error(e);
}

