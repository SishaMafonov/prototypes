import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) throw new Error('Missing app element');

app.innerHTML = `
  <main>
    <h1>Fool House</h1>
    <p>Welcome to your new prototype.</p>
  </main>
`;
