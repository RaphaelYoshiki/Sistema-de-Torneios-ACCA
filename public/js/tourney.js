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
  if (!matches.length) return `<div class="bracket-empty">Nenhum atleta inscrito.</div>`;

  const participantCount = matches.reduce((sum, match) => sum + (match.left ? 1 : 0) + (match.right ? 1 : 0), 0);
  const bracketSize = nextPowerOfTwo(Math.max(participantCount, 2));
  const round0Slots = bracketSize / 2;
  const dummiesTotal = round0Slots - matches.length;
  const dummiesTop = Math.ceil(dummiesTotal / 2); 
  const dummiesBottom = Math.floor(dummiesTotal / 2);

  const paddedMatches = [];
  for (let i = 0; i < dummiesTop; i++) paddedMatches.push({ id: `dummy-t-${i}`, isDummy: true, left: null, right: null });
  matches.forEach((match, i) => paddedMatches.push({ id: `r0-m${i}`, isDummy: false, left: match.left, right: match.right }));
  for (let i = 0; i < dummiesBottom; i++) paddedMatches.push({ id: `dummy-b-${i}`, isDummy: true, left: null, right: null });

  const roundCount = Math.max(1, Math.log2(bracketSize));
  const rounds = Array.from({ length: roundCount }, () => []);
  
  // Calcula o centro absoluto (Y) de cada match
  rounds[0] = paddedMatches.map((m, i) => {
    const H = 6; // Base height da Round 0 em rem
    const flexCenter = i * H + H / 2;
    return {
      ...m,
      isPassThrough: false,
      flexCenter: flexCenter,
      absoluteY: flexCenter,
      offsetY: 0
    };
  });

  for (let round = 1; round < roundCount; round += 1) {
    const previous = rounds[round - 1];
    const H = 6 * Math.pow(2, round);
    
    for (let i = 0; i < Math.ceil(previous.length / 2); i += 1) {
      const leftMatch = previous[i * 2];
      const rightMatch = previous[i * 2 + 1];
      
      const isDummy = leftMatch?.isDummy && rightMatch?.isDummy;
      const isPassThrough = (leftMatch?.isDummy && !rightMatch?.isDummy) || (!leftMatch?.isDummy && rightMatch?.isDummy);
      
      const flexCenter = i * H + H / 2;
      let absoluteY = flexCenter;
      
      if (isDummy) {
        absoluteY = flexCenter;
      } else if (isPassThrough) {
        absoluteY = leftMatch?.isDummy ? rightMatch.absoluteY : leftMatch.absoluteY;
      } else {
        absoluteY = flexCenter; 
      }
      
      rounds[round].push({
        id: `round${round}-match${i}`,
        isDummy: isDummy,
        isPassThrough: isPassThrough,
        left: null,
        right: null,
        flexCenter: flexCenter,
        absoluteY: absoluteY,
        offsetY: absoluteY - flexCenter // Diferença matemática para anular curvas
      });
    }
  }

  let html = `<div class="bracket-tree-wrapper"><div class="bracket-tree">`;

  rounds.forEach((roundMatches, roundIndex) => {
    html += `<div class="round-column round-${roundIndex}">`;
    
    roundMatches.forEach((match, matchIndex) => {
      const isLastRound = roundIndex === rounds.length - 1;
      const showLeftSlot = roundIndex > 0 || match.left; 
      const showRightSlot = roundIndex > 0 || match.right;
      const isBye = (!showLeftSlot || !showRightSlot) && roundIndex === 0;

      // Estilos inline injetados apenas onde é necessário uma linha reta
      const lineOffsetStyle = match.offsetY !== 0 ? `top: calc(50% + ${match.offsetY}rem);` : '';
      const boxOffsetStyle = match.offsetY !== 0 ? `transform: translateY(${match.offsetY}rem);` : '';

      let drawVertical = false;
      let verticalTop = 0;
      let verticalHeight = 0;

      if (!isLastRound && matchIndex % 2 === 0) {
        const nextMatch = roundMatches[matchIndex + 1];
        // Desenha conexão vertical apenas se NENHUM for caixa omitida (anula a curva pro vazio)
        if (!match.isDummy && nextMatch && !nextMatch.isDummy) {
          drawVertical = true;
          const H = 6 * Math.pow(2, roundIndex);
          verticalTop = match.offsetY;
          verticalHeight = H + nextMatch.offsetY - match.offsetY;
        }
      }
      
      html += `
        <div class="round-match-wrapper ${match.isDummy ? 'dummy-match-wrapper' : ''}">
          ${roundIndex > 0 ? `<div class="bracket-line-in" style="${lineOffsetStyle}"></div>` : ''}
          ${match.isPassThrough ? `<div class="bracket-line-through" style="${lineOffsetStyle}"></div>` : ''}

          <div class="match-box ${match.isDummy ? 'dummy-match-box' : ''} ${match.isPassThrough ? 'pass-through-box' : ''} ${isBye ? 'has-bye' : ''}" style="${boxOffsetStyle}">
            <div class="athlete-slot ${!showLeftSlot && roundIndex === 0 ? 'empty-slot' : ''}">
              ${match.left ? `
                <div class="entry-name">${match.left.athlete_name}</div>
                <div class="entry-sub">${match.left.academy} • ${match.left.belt || 'N/A'}</div>
              ` : (roundIndex === 0 ? '' : '<div class="entry-name placeholder">&nbsp;</div>')}
            </div>
            <div class="athlete-slot ${!showRightSlot && roundIndex === 0 ? 'empty-slot' : ''}">
              ${match.right ? `
                <div class="entry-name">${match.right.athlete_name}</div>
                <div class="entry-sub">${match.right.academy} • ${match.right.belt || 'N/A'}</div>
              ` : (roundIndex === 0 ? '' : '<div class="entry-name placeholder">&nbsp;</div>')}
            </div>
          </div>

          ${!isLastRound ? `
            <div class="bracket-connector-group">
              <div class="bracket-line-out" style="${lineOffsetStyle}"></div>
              ${drawVertical ? `<div class="bracket-line-vertical" style="top: calc(50% + ${verticalTop}rem); height: ${verticalHeight}rem;"></div>` : ''}
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
    @page { size: landscape; margin: 10mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: sans-serif; font-size: 14px; width: auto; height: auto; }
    h1 { font-size: 18px; margin: 0 0 15px 0; padding: 0; color: #000; }
    
    .bracket-content, .bracket-tree-wrapper { 
      padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; 
      width: max-content !important; height: auto !important; max-height: none !important; 
      overflow: visible !important; background: transparent !important;
    }

    .bracket-tree { display: flex !important; flex-direction: row !important; align-items: flex-start !important; }
    .round-column { display: flex; flex-direction: column; justify-content: flex-start; width: 16rem; position: relative; }
    .round-match-wrapper { display: flex; align-items: center; position: relative; width: 100%; }
    
    .match-box { border: none !important; background: transparent !important; width: 13rem; height: 4.8rem; z-index: 2; display: flex; flex-direction: column; justify-content: center; }
    .athlete-slot { padding: 0.4rem 0.6rem; height: 2.4rem; display: flex; flex-direction: column; justify-content: center; border: 1px solid #000 !important; background: #fff !important; border-radius: 4px; }
    .athlete-slot:first-child { border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none !important; }
    .athlete-slot:last-child { border-top-left-radius: 0; border-top-right-radius: 0; }
    .athlete-slot.empty-slot { display: none !important; }
    .match-box.has-bye .athlete-slot { border: 1px solid #000 !important; border-radius: 4px !important; }
    
    .dummy-match-box, .pass-through-box { visibility: hidden !important; }
    .dummy-match-wrapper .bracket-line-in, .dummy-match-wrapper .bracket-line-out { visibility: hidden !important; }
    
    .entry-name { font-size: 0.85rem; font-weight: 700; color: #000 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .entry-sub { font-size: 0.65rem; color: #000 !important; }
    
    .bracket-line-through { position: absolute; left: -1.5rem; top: 50%; width: 16rem; height: 1px; border-top: 1px solid #000 !important; z-index: 1; }
    .bracket-line-in { position: absolute; left: -1.5rem; top: 50%; width: 1.5rem; height: 1px; border-top: 1px solid #000 !important; z-index: 1; }
    .bracket-line-out { position: absolute; left: 13rem; top: 50%; width: 1.5rem; height: 1px; border-top: 1px solid #000 !important; z-index: 1; }
    
    .round-0 { --round-height: 6rem; }
    .round-1 { --round-height: 12rem; }
    .round-2 { --round-height: 24rem; }
    .round-3 { --round-height: 48rem; }
    .round-4 { --round-height: 96rem; }
    
    .round-0 .round-match-wrapper { height: 6rem; }
    .round-1 .round-match-wrapper { height: 12rem; }
    .round-2 .round-match-wrapper { height: 24rem; }
    .round-3 .round-match-wrapper { height: 48rem; }
    .round-4 .round-match-wrapper { height: 96rem; }
    
    .bracket-line-vertical { position: absolute; left: 14.5rem; border-right: 1px solid #000 !important; z-index: 1; }
  `;
  
  printWindow.document.write(`<!doctype html><html><head><title>${bracketTitle.textContent}</title><style>${printCss}</style></head><body><h1>${bracketTitle.textContent}</h1>${bracketBody.innerHTML}</body></html>`);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
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
