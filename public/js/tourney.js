document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form || form.tagName !== 'FORM') return;

  const postJson = async (action, formData) => {
    const body = new URLSearchParams();
    for (const pair of formData.entries()) body.append(pair[0], pair[1]);
    const response = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } });
    return response.json();
  };

  if (form.classList.contains('athlete-add-form')) {
    e.preventDefault();
    try {
      const json = await postJson(form.action, new FormData(form));
      if (!json || !json.success) return;

      const genderMap = { masculino: 'male', feminino: 'female' };
      let gender = form.dataset.gender || json.gender;
      gender = genderMap[gender] || gender;
      const subsection = form.closest('.weight-category-subsection');
      const genderCol = subsection
        ? subsection.querySelector(`.gender-column.${gender}`) || subsection.querySelector('.gender-column.festival') || subsection.querySelector('.gender-column')
        : null;
      const registeredList = genderCol ? genderCol.querySelector('.registered-list') : null;

      if (!registeredList) {
        console.error('Registrar: registeredList não encontrada', { gender, subsection });
        return;
      }

      const registrationItem = document.createElement('div');
      registrationItem.className = 'registration-item';
      registrationItem.innerHTML = `
        <span>${json.name}</span>
        <form method="post" action="/tourney/${location.pathname.split('/').pop()}/unregister" class="inline-form">
          <input type="hidden" name="registrationId" value="${json.registrationId}" />
          <input type="hidden" name="athleteId" value="${json.athleteId}" />
          <button type="submit" class="button-danger">Remover</button>
        </form>
      `;

      registeredList.appendChild(registrationItem);
      form.remove();

      const emptyMessage = registeredList.querySelector('.empty-msg');
      if (emptyMessage) emptyMessage.remove();

      if (window.tourneyBracketData) {
        window.tourneyBracketData = window.tourneyBracketData.filter((item) => item.id !== json.registrationId);
      } else {
        window.tourneyBracketData = [];
      }
      window.tourneyBracketData.push({
        id: json.registrationId,
        athlete_id: json.athleteId,
        age_category: json.ageCategory,
        weight_category: json.weightCategory || '',
        gender: json.gender,
        athlete_name: json.name,
        belt: json.belt || '',
        sensei_name: json.sensei_name || '',
        academy: json.academy || '',
      });
    } catch (err) {
      console.error('Register AJAX error', err);
    }
    return;
  }

  if (form.classList.contains('inline-form') && form.action && form.action.endsWith('/unregister')) {
    e.preventDefault();
    try {
      const json = await postJson(form.action, new FormData(form));
      if (!json || !json.success) return;

      const regItem = form.closest('.registration-item');
      if (!regItem) return;

      const subsection = regItem.closest('.weight-category-subsection');
      const genderCol = regItem.closest('.gender-column');
      const genderClass = genderCol
        ? (genderCol.classList.contains('female') ? 'female' : genderCol.classList.contains('male') ? 'male' : 'festival')
        : null;
      const available = genderClass
        ? subsection.querySelector(`.gender-column.${genderClass} .available-athletes`)
        : subsection.querySelector('.available-athletes');
      const athleteId = form.querySelector('input[name="athleteId"]')?.value || null;
      const name = regItem.querySelector('span')?.textContent || '';
      regItem.remove();

      if (!available || !athleteId) return;

      if (window.tourneyBracketData) {
        window.tourneyBracketData = window.tourneyBracketData.filter((item) => String(item.id) !== String(json.registrationId));
      }

      const addForm = document.createElement('form');
      addForm.className = 'athlete-add-form';
      addForm.method = 'post';
      addForm.action = `/tourney/${location.pathname.split('/').pop()}/register`;
      if (genderClass) addForm.dataset.gender = genderClass;
      const ageKey = subsection.closest('.age-category-section')?.dataset.ageKey || '';
      const weightKey = subsection.dataset.weightKey || '';
      addForm.innerHTML = `
        <input type="hidden" name="athleteId" value="${athleteId}" />
        <input type="hidden" name="ageCategory" value="${ageKey}" />
        <input type="hidden" name="weightCategory" value="${weightKey}" />
        <button type="submit" class="athlete-add-btn">+ ${name}</button>
      `;
      available.appendChild(addForm);
    } catch (err) {
      console.error('Unregister AJAX error', err);
    }
  }
});

const buildListHtml = (entries) => {
  if (!entries.length) {
    return `<div class="bracket-empty">Nenhum atleta inscrito.</div>`;
  }

  let html = `<div class="bracket-list"><div class="bracket-list-items">`;
  entries.forEach((entry, index) => {
    html += `
      <div class="bracket-list-item">
        <div class="entry-name">${index + 1}. ${entry.athlete_name}</div>
        <div class="entry-meta">${entry.sensei_name} • ${entry.academy}</div>
        <div class="entry-belt">Faixa: ${entry.belt || 'N/A'}</div>
      </div>
    `;
  });
  html += '</div></div>';
  return html;
};

const nextPowerOfTwo = (value) => {
  let power = 1;
  while (power < value) power <<= 1;
  return power;
};

const buildBracketHtml = (matches, title) => {
  if (!matches.length) {
    return `<div class="bracket-empty">Nenhum atleta inscrito.</div>`;
  }

  const participantCount = matches.reduce((sum, match) => sum + (match.left ? 1 : 0) + (match.right ? 1 : 0), 0);
  const bracketSize = nextPowerOfTwo(Math.max(participantCount, 2));
  const roundCount = Math.max(1, Math.log2(bracketSize));
  const rounds = Array.from({ length: roundCount }, () => []);

  rounds[0] = matches.map((match, index) => ({
    id: `round0-match${index}`,
    left: match.left,
    right: match.right,
  }));

  for (let round = 1; round < roundCount; round += 1) {
    const previous = rounds[round - 1];
    for (let i = 0; i < Math.ceil(previous.length / 2); i += 1) {
      rounds[round].push({
        id: `round${round}-match${i}`,
        left: null,
        right: null,
      });
    }
  }

  let html = `<div class="bracket-tree-wrapper"><div class="bracket-tree">`;

  rounds.forEach((roundMatches, roundIndex) => {
    // Adicionamos uma classe identificando a rodada atual para calcular o espaçamento no CSS
    html += `<div class="round-column round-${roundIndex}">`;
    
    roundMatches.forEach((match, matchIndex) => {
      const isLeftBye = match.left && !match.right;
      const isLastRound = roundIndex === rounds.length - 1;
      
      html += `
        <div class="round-match-wrapper">
          ${roundIndex > 0 ? '<div class="bracket-line-in"></div>' : ''}

          <div class="match-box">
            <div class="athlete-slot">
              ${match.left ? `
                <div class="entry-name">${match.left.athlete_name}</div>
                <div class="entry-sub">${match.left.academy} • ${match.left.belt || 'N/A'}</div>
              ` : '<div class="entry-name placeholder">&nbsp;</div>'}
            </div>
            <div class="athlete-slot">
              ${match.right ? `
                <div class="entry-name">${match.right.athlete_name}</div>
                <div class="entry-sub">${match.right.academy} • ${match.right.belt || 'N/A'}</div>
              ` : isLeftBye ? '<div class="entry-name bye">Cabeça de Chave</div>' : '<div class="entry-name placeholder">&nbsp;</div>'}
            </div>
          </div>

          ${!isLastRound ? `
            <div class="bracket-connector-group">
              <div class="bracket-line-out"></div>
              ${matchIndex % 2 === 0 ? '<div class="bracket-line-vertical"></div>' : ''}
            </div>
          ` : ''}
        </div>
      `;
    });
    
    html += '</div>';
  });

  html += '</div></div>';
  return html;
};

const sortEntriesForBracket = (entries) => {
  const beltRank = {
    branco: 1,
    amarelo: 2,
    laranja: 3,
    verde: 4,
    azul: 5,
    roxa: 6,
    marrom: 7,
    preta: 8,
  };

  return [...entries].sort((a, b) => {
    const beltDiff = (beltRank[a.belt.toLowerCase()] || 0) - (beltRank[b.belt.toLowerCase()] || 0);
    if (beltDiff !== 0) return beltDiff;
    return a.athlete_name.localeCompare(b.athlete_name, 'pt-BR');
  });
};

const createBracketEntries = (data, ageKey, weightKey, gender) => {
  let filtered = data.filter((item) => item.age_category === ageKey);
  if (weightKey) {
    filtered = filtered.filter((item) => item.weight_category === weightKey);
  }
  if (gender) {
    filtered = filtered.filter((item) => normalizeGender(item.gender) === gender);
  }
  return sortEntriesForBracket(filtered);
};

const splitByExperience = (entries) => {
  const experienced = [];
  const inexperienced = [];
  const highBelts = new Set(['roxa', 'marrom', 'preta']);

  entries.forEach((entry) => {
    if (highBelts.has(entry.belt.toLowerCase())) {
      experienced.push(entry);
    } else {
      inexperienced.push(entry);
    }
  });

  return { experienced, inexperienced };
};

const pairBracketEntries = (entries) => {
  const { experienced, inexperienced } = splitByExperience(entries);
  const pairs = [];
  const combined = [];

  while (experienced.length || inexperienced.length) {
    let left = null;
    let right = null;

    if (experienced.length && inexperienced.length) {
      left = experienced.shift();
      right = inexperienced.shift();
    } else if (experienced.length >= 2) {
      left = experienced.shift();
      right = experienced.shift();
    } else if (experienced.length === 1) {
      left = experienced.shift();
      right = inexperienced.shift() || null;
    } else {
      left = inexperienced.shift();
      right = inexperienced.shift() || null;
    }

    combined.push({
      left,
      right,
    });
  }

  return combined;
};

const normalizeGender = (gender) => {
  if (!gender) return null;
  const value = String(gender).trim().toLowerCase();
  if (value === 'masculino' || value === 'male') return 'male';
  if (value === 'feminino' || value === 'female') return 'female';
  return null;
};

const bracketModal = document.getElementById('bracket-modal');
const bracketBody = document.getElementById('bracket-body');
const bracketTitle = document.getElementById('bracket-title');
const bracketCloseBtn = document.getElementById('bracket-close-btn');
const bracketPrintBtn = document.getElementById('bracket-print-btn');

const openBracketModal = (title, html) => {
  bracketTitle.textContent = title;
  bracketBody.innerHTML = html;
  bracketModal.classList.remove('hidden');
};

const closeBracketModal = () => {
  bracketModal.classList.add('hidden');
};

bracketCloseBtn?.addEventListener('click', closeBracketModal);
bracketPrintBtn?.addEventListener('click', () => {
  if (!bracketBody) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const printCss = `
    body { font-family: sans-serif; padding: 1rem; color: #000; background: #fff; font-size: 16px; }
    .bracket-body {
      display: block !important;
      overflow: auto !important;
      max-height: 80vh;
      width: 100%;
      box-sizing: border-box;
    }
    .bracket-tree-wrapper {
      font-size: 16px !important;
      display: inline-block !important; 
      min-width: 100%;
      box-sizing: border-box;
    }
    .bracket-tree {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important; 
    }
    .round-column { display: flex; flex-direction: column; justify-content: flex-start; width: 16rem; position: relative; }
    .round-match-wrapper { display: flex; align-items: center; position: relative; box-sizing: border-box; width: 100%; }
    .match-box { border: 1px solid #000 !important; border-radius: 4px; background: #fff !important; width: 13rem; box-sizing: border-box; z-index: 2; }
    .athlete-slot { padding: 0.4rem 0.6rem; height: 2.4rem; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; }
    .athlete-slot:first-child { border-bottom: 1px solid #000 !important; }
    .entry-name { font-size: 0.8rem; font-weight: 700; color: #000 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .entry-sub { font-size: 0.65rem; color: #000 !important; }
    .entry-name.bye { font-style: italic; }
    
    .round-0 .round-match-wrapper { height: 6rem; }
    .round-1 .round-match-wrapper { height: 12rem; }
    .round-2 .round-match-wrapper { height: 24rem; }
    .round-3 .round-match-wrapper { height: 48rem; }

    .bracket-line-in { position: absolute; left: -1.5rem; top: 50%; width: 1.5rem; height: 1px; border-top: 1px solid #000 !important; z-index: 1; }
    .bracket-line-out { position: absolute; left: 13rem; top: 50%; width: 1.5rem; height: 1px; border-top: 1px solid #000 !important; z-index: 1; }
    .bracket-line-vertical { position: absolute; left: 14.5rem; border-right: 1px solid #000 !important; z-index: 1; }
    
    .round-0 .bracket-line-vertical { top: 50%; height: 6rem; }
    .round-1 .bracket-line-vertical { top: 50%; height: 12rem; }
    .round-2 .bracket-line-vertical { top: 50%; height: 24rem; }
    .round-3 .bracket-line-vertical { top: 50%; height: 48rem; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  `;
  printWindow.document.write(`<!doctype html><html><head><title>${bracketTitle.textContent}</title><style>${printCss}</style></head><body><h1>${bracketTitle.textContent}</h1>${bracketBody.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
});

const handleBracketButtonClick = (button) => {
  const ageKey = button.dataset.ageKey;
  const weightKey = button.dataset.weightKey;
  const gender = button.dataset.gender ? normalizeGender(button.dataset.gender) : null;
  const displayType = button.dataset.displayType;

  const entries = createBracketEntries(window.tourneyBracketData, ageKey, weightKey, gender);
  const title = displayType === 'list'
    ? `Lista de inscritos — ${ageKey}${weightKey ? ` / ${weightKey}` : ''}`
    : `Chave — ${ageKey}${weightKey ? ` / ${weightKey}` : ''}${gender ? ` / ${gender === 'male' ? 'Masculino' : 'Feminino'}` : ''}`;
  const html = displayType === 'list'
    ? buildListHtml(entries, title)
    : buildBracketHtml(pairBracketEntries(entries), title);
  openBracketModal(title, html);
};

document.querySelectorAll('.bracket-button').forEach((button) => {
  button.addEventListener('click', () => handleBracketButtonClick(button));
});
