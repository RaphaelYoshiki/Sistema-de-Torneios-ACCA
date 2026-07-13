document.addEventListener('DOMContentLoaded', () => {
  const showForm = document.getElementById('show-athlete-form');
  const cancelForm = document.getElementById('cancel-athlete-form');
  const athleteForm = document.getElementById('athlete-form');
  const athleteId = document.getElementById('athlete-id');
  const athleteName = document.getElementById('athlete-name');
  const athleteGender = document.getElementById('athlete-gender');
  const athleteBirthdate = document.getElementById('athlete-birthdate');
  const athleteWeight = document.getElementById('athlete-weight');
  const athleteBelt = document.getElementById('athlete-belt');

  if (showForm && athleteForm) {
    showForm.addEventListener('click', () => {
      athleteForm.classList.remove('hidden');
      athleteId.value = '';
      athleteName.value = '';
      athleteGender.value = '';
      athleteBirthdate.value = '';
      athleteWeight.value = '';
      athleteBelt.value = '';
    });
  }

  if (cancelForm && athleteForm) {
    cancelForm.addEventListener('click', () => {
      athleteForm.classList.add('hidden');
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
      athleteForm.classList.remove('hidden');
      athleteId.value = athlete.id;
      athleteName.value = athlete.name;
      athleteGender.value = normalizeGender(athlete.gender);
      athleteBirthdate.value = athlete.birthdate;
      athleteWeight.value = athlete.weight;
      athleteBelt.value = athlete.belt;
    });
  });
});
