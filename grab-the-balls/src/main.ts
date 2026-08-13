import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("The application root is missing.");
}

app.innerHTML = `
  <main>
    <p class="eyebrow">NEW GAME PROTOTYPE</p>
    <h1>Grab the Balls</h1>
    <p>Your TypeScript and Vite project is ready.</p>
  </main>
`;
