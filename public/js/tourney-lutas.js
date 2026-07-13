document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('pair-form');
  const aSelect = document.getElementById('athleteA');
  const bSelect = document.getElementById('athleteB');

  if (!form || !aSelect || !bSelect) return;

  form.addEventListener('submit', (e) => {
    // Allow creating a fight with at least one athlete
    if (aSelect.value === '' && bSelect.value === '') {
      e.preventDefault();
      alert('Escolha pelo menos um atleta para casar a luta.');
      return;
    }
    if (aSelect.value !== '' && bSelect.value !== '' && aSelect.value === bSelect.value) {
      e.preventDefault();
      alert('Não é possível casar um atleta com ele mesmo.');
      return;
    }
  });

  // Optional: prevent selecting same athlete on change
  const syncDisable = () => {
    const aVal = aSelect.value;
    Array.from(bSelect.options).forEach((opt) => {
      opt.disabled = (opt.value === aVal && aVal !== '');
    });
  };
  aSelect.addEventListener('change', syncDisable);
  // validation for add-opponent forms inside fight list
  document.querySelectorAll('.add-opponent-form').forEach((frm) => {
    frm.addEventListener('submit', (e) => {
      const sel = frm.querySelector('select[name="opponentId"]');
      if (!sel || sel.value === '') {
        e.preventDefault();
        alert('Escolha um atleta para adicionar como adversário.');
      }
    });
  });

  const printBtn = document.getElementById('print-fights-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
});
