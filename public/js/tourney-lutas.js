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
    printBtn.addEventListener('click', () => {
      // Localiza todos os botões "Remover" para extrair as lutas da tela com precisão
      const removeButtons = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent.trim() === 'Remover'
      );

      let fightsHtml = '';

      removeButtons.forEach((btn, index) => {
        const container = btn.closest('div') || btn.parentElement;
        // Pega o texto inteiro do container limpando o botão "Remover"
        const fullText = container.textContent.replace('Remover', '').trim();

        // Separa os atletas usando a palavra "vs" como divisor
        const parts = fullText.split(/\s+vs\s+/i);
        const athleteA = parts[0] ? parts[0].trim() : 'A definir';
        const athleteB = parts[1] ? parts[1].trim() : 'A definir';

        fightsHtml += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;"><strong>Luta ${index + 1}</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${athleteA}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">VS</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${athleteB}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; width: 150px;"></td>
          </tr>
        `;
      });

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Listagem de Lutas Casadas</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #000; }
              h1 { text-align: center; font-size: 1.5rem; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #f2f2f2; padding: 10px; border-bottom: 2px solid #000; text-align: left; }
              th.center, td.center { text-align: center; }
              @media print {
                @page { margin: 1cm; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>Listagem de Lutas Casadas</h1>
            <table>
              <thead>
                <tr>
                  <th class="center" style="width: 10%;">#</th>
                  <th style="width: 35%;">Atleta A</th>
                  <th class="center" style="width: 10%;">VS</th>
                  <th style="width: 35%;">Atleta B</th>
                  <th style="width: 10%;">Vencedor</th>
                </tr>
              </thead>
              <tbody>
                ${fightsHtml || '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma luta casada encontrada.</td></tr>'}
              </tbody>
            </table>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    });
  }
});
