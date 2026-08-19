document.addEventListener('DOMContentLoaded', () => {
  const termsModal = document.getElementById('tourney-terms-modal');
  const openTerms = document.getElementById('open-tourney-terms');
  const closeTerms = document.getElementById('close-tourney-terms');

  const hideTerms = () => {
    if (!termsModal) return;
    termsModal.classList.add('hidden');
    termsModal.setAttribute('aria-hidden', 'true');
  };

  const showTerms = () => {
    if (!termsModal) return;
    termsModal.classList.remove('hidden');
    termsModal.setAttribute('aria-hidden', 'false');
    closeTerms?.focus();
  };

  openTerms?.addEventListener('click', showTerms);
  closeTerms?.addEventListener('click', hideTerms);
  termsModal?.querySelector('[data-close-tourney-terms]')?.addEventListener('click', hideTerms);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && termsModal && !termsModal.classList.contains('hidden')) {
      hideTerms();
    }
  });

  const showForm = document.getElementById('show-athlete-form');
  const closeForm = document.getElementById('close-athlete-form');
  const cancelForm = document.getElementById('cancel-athlete-form');
  const athleteOverlay = document.getElementById('athlete-form-overlay');
  const athleteForm = document.getElementById('athlete-form');
  const athleteId = document.getElementById('athlete-id');
  const athleteName = document.getElementById('athlete-name');
  const athleteGender = document.getElementById('athlete-gender');
  const athleteBirthdate = document.getElementById('athlete-birthdate');
  const athleteWeight = document.getElementById('athlete-weight');
  const athleteBelt = document.getElementById('athlete-belt');

  const resetAthleteForm = () => {
    athleteId.value = '';
    athleteName.value = '';
    athleteGender.value = '';
    athleteBirthdate.value = '';
    athleteWeight.value = '';
    athleteBelt.value = '';
  };

  const openAthleteForm = () => {
    athleteOverlay.classList.remove('hidden');
    athleteOverlay.setAttribute('aria-hidden', 'false');
    athleteName.focus();
  };

  const hideAthleteForm = () => {
    athleteOverlay.classList.add('hidden');
    athleteOverlay.setAttribute('aria-hidden', 'true');
  };

  if (showForm && athleteForm) {
    showForm.addEventListener('click', () => {
      resetAthleteForm();
      openAthleteForm();
    });
  }

  if (closeForm && athleteOverlay) {
    closeForm.addEventListener('click', hideAthleteForm);
  }

  if (cancelForm && athleteOverlay) {
    cancelForm.addEventListener('click', () => {
      hideAthleteForm();
    });
  }

  if (athleteOverlay) {
    athleteOverlay.addEventListener('click', (event) => {
      if (event.target === athleteOverlay) {
        hideAthleteForm();
      }
    });
  }

  const normalizeGender = (gender) => {
    if (!gender) return '';
    const value = String(gender).trim().toLowerCase();
    if (value === 'masculino' || value === 'male') return 'masculino';
    if (value === 'feminino' || value === 'female') return 'feminino';
    return '';
  };

  document.querySelectorAll('.edit-athlete').forEach((button) => {
    button.addEventListener('click', () => {
      const athlete = JSON.parse(button.dataset.athlete);
      openAthleteForm();
      athleteId.value = athlete.id;
      athleteName.value = athlete.name;
      athleteGender.value = normalizeGender(athlete.gender);
      athleteBirthdate.value = athlete.birthdate;
      athleteWeight.value = athlete.weight;
      athleteBelt.value = athlete.belt;
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && athleteOverlay && !athleteOverlay.classList.contains('hidden')) {
      hideAthleteForm();
    }
  });
});
