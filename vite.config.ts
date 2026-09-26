import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' כדי שהבילד יעבוד גם מתיקייה מקומית וגם מכל שרת סטטי
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    globals: true,
    environment: 'node',
    // בלי זה ייבוא styles.css?raw בבדיקות מחזיר מחרוזת ריקה
    css: true,
  },
});
