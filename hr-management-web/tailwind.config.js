/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    // 테마에서 동적으로 사용되는 색상 클래스들
    { pattern: /bg-(green|blue|amber|indigo|rose|emerald|purple|slate)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /shadow-(green|blue|amber|indigo|rose|emerald|purple|slate)-(50|100|200|300|400|500|600|700|800|900)\/(10|20|30|50)/ },
    { pattern: /text-(green|blue|amber|indigo|rose|emerald|purple|slate)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-(green|blue|amber|indigo|rose|emerald|purple|slate)-(50|100|200|300|400|500|600|700|800|900)/ },
  ],
  theme: {
    extend: {
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}
