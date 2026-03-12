export const metadata = {
  title: "GenerativeRank — AI Visibility Audit",
  description: "Be the Answer, Not Just the Link. Audit your AI citation likelihood.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <style>{`
          *{margin:0;padding:0;box-sizing:border-box}
          body{background:#06080F;color:#E8ECF4;font-family:'Outfit',sans-serif;overflow-x:hidden}
          ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#06080F}::-webkit-scrollbar-thumb{background:#252B3B;border-radius:3px}
          @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
          @keyframes rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          .anim-fade-up{animation:fadeUp .6s ease both}.anim-fade-in{animation:fadeIn .4s ease both}
          input:focus,button:focus{outline:none}a{color:inherit;text-decoration:none}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
