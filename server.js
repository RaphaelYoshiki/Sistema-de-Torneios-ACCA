const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const PDFDocument = require('pdfkit');
const { init, run, get, all } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'judo-registration-secret';

const ageCategories = [
  { key: 'Festival', label: 'Festival (Sub 7)', minAge: 0, maxAge: 6 },
  { key: 'Sub9', label: 'Sub 9', minAge: 7, maxAge: 8 },
  { key: 'Sub11', label: 'Sub 11', minAge: 9, maxAge: 10 },
  { key: 'Sub13', label: 'Sub 13', minAge: 11, maxAge: 12 },
  { key: 'Sub15', label: 'Sub 15', minAge: 13, maxAge: 14 },
  { key: 'Sub18', label: 'Sub 18', minAge: 15, maxAge: 17 },
  { key: 'Senior', label: 'Sênior', minAge: 18, maxAge: 100 },
];

// Weight classes (labels + per-age ranges separated by gender). Festival (Sub 7) does not use weight divisions.
const weightCategories = [
  {
    key: 'SuperLigeiro',
    label: 'Super Ligeiro',
    ranges: {
      male: {
        Sub9: { maxInclusive: 23 },
        Sub11: { maxInclusive: 28 },
        Sub13: { maxInclusive: 28 },
        Sub15: { maxInclusive: 40 },
        Sub18: { maxInclusive: 50 },
      },
      female: {
        Sub9: { maxInclusive: 23 },
        Sub11: { maxInclusive: 28 },
        Sub13: { maxInclusive: 28 },
        Sub15: { maxInclusive: 36 },
        Sub18: { maxInclusive: 40 },
      },
    },
  },
  {
    key: 'Ligeiro',
    label: 'Ligeiro',
    ranges: {
      male: {
        Sub9: { minExclusive: 23, maxInclusive: 26 },
        Sub11: { minExclusive: 28, maxInclusive: 30 },
        Sub13: { minExclusive: 28, maxInclusive: 31 },
        Sub15: { minExclusive: 40, maxInclusive: 45 },
        Sub18: { minExclusive: 50, maxInclusive: 55 },
      },
      female: {
        Sub9: { minExclusive: 23, maxInclusive: 26 },
        Sub11: { minExclusive: 28, maxInclusive: 30 },
        Sub13: { minExclusive: 28, maxInclusive: 31 },
        Sub15: { minExclusive: 36, maxInclusive: 40 },
        Sub18: { minExclusive: 40, maxInclusive: 44 },
      },
    },
  },
  {
    key: 'MeioLeve',
    label: 'Meio Leve',
    ranges: {
      male: {
        Sub9: { minExclusive: 26, maxInclusive: 29 },
        Sub11: { minExclusive: 30, maxInclusive: 33 },
        Sub13: { minExclusive: 31, maxInclusive: 34 },
        Sub15: { minExclusive: 45, maxInclusive: 50 },
        Sub18: { minExclusive: 55, maxInclusive: 60 },
      },
      female: {
        Sub9: { minExclusive: 26, maxInclusive: 29 },
        Sub11: { minExclusive: 30, maxInclusive: 33 },
        Sub13: { minExclusive: 31, maxInclusive: 34 },
        Sub15: { minExclusive: 40, maxInclusive: 44 },
        Sub18: { minExclusive: 44, maxInclusive: 48 },
      },
    },
  },
  {
    key: 'Leve',
    label: 'Leve',
    ranges: {
      male: {
        Sub9: { minExclusive: 29, maxInclusive: 32 },
        Sub11: { minExclusive: 33, maxInclusive: 36 },
        Sub13: { minExclusive: 34, maxInclusive: 38 },
        Sub15: { minExclusive: 50, maxInclusive: 55 },
        Sub18: { minExclusive: 60, maxInclusive: 66 },
      },
      female: {
        Sub9: { minExclusive: 29, maxInclusive: 32 },
        Sub11: { minExclusive: 33, maxInclusive: 36 },
        Sub13: { minExclusive: 34, maxInclusive: 38 },
        Sub15: { minExclusive: 44, maxInclusive: 48 },
        Sub18: { minExclusive: 48, maxInclusive: 52 },
      },
    },
  },
  {
    key: 'MeioMedio',
    label: 'Meio Médio',
    ranges: {
      male: {
        Sub9: { minExclusive: 32, maxInclusive: 36 },
        Sub11: { minExclusive: 36, maxInclusive: 40 },
        Sub13: { minExclusive: 38, maxInclusive: 42 },
        Sub15: { minExclusive: 55, maxInclusive: 60 },
        Sub18: { minExclusive: 66, maxInclusive: 73 },
      },
      female: {
        Sub9: { minExclusive: 32, maxInclusive: 36 },
        Sub11: { minExclusive: 36, maxInclusive: 40 },
        Sub13: { minExclusive: 38, maxInclusive: 42 },
        Sub15: { minExclusive: 48, maxInclusive: 52 },
        Sub18: { minExclusive: 52, maxInclusive: 57 },
      },
    },
  },
  {
    key: 'Medio',
    label: 'Médio',
    ranges: {
      male: {
        Sub9: { minExclusive: 36, maxInclusive: 40 },
        Sub11: { minExclusive: 40, maxInclusive: 45 },
        Sub13: { minExclusive: 42, maxInclusive: 47 },
        Sub15: { minExclusive: 60, maxInclusive: 66 },
        Sub18: { minExclusive: 73, maxInclusive: 81 },
      },
      female: {
        Sub9: { minExclusive: 36, maxInclusive: 40 },
        Sub11: { minExclusive: 40, maxInclusive: 45 },
        Sub13: { minExclusive: 42, maxInclusive: 47 },
        Sub15: { minExclusive: 52, maxInclusive: 57 },
        Sub18: { minExclusive: 57, maxInclusive: 63 },
      },
    },
  },
  {
    key: 'MeioPesado',
    label: 'Meio Pesado',
    ranges: {
      male: {
        Sub9: { minExclusive: 40, maxInclusive: 45 },
        Sub11: { minExclusive: 45, maxInclusive: 50 },
        Sub13: { minExclusive: 47, maxInclusive: 52 },
        Sub15: { minExclusive: 66, maxInclusive: 73 },
        Sub18: { minExclusive: 81, maxInclusive: 90 },
      },
      female: {
        Sub9: { minExclusive: 40, maxInclusive: 45 },
        Sub11: { minExclusive: 45, maxInclusive: 50 },
        Sub13: { minExclusive: 47, maxInclusive: 52 },
        Sub15: { minExclusive: 57, maxInclusive: 63 },
        Sub18: { minExclusive: 63, maxInclusive: 70 },
      },
    },
  },
  {
    key: 'Pesado',
    label: 'Pesado',
    ranges: {
      male: {
        Sub9: { minExclusive: 45, maxInclusive: 50 },
        Sub11: { minExclusive: 50, maxInclusive: 55 },
        Sub13: { minExclusive: 52, maxInclusive: 60 },
        Sub15: { minExclusive: 73, maxInclusive: 81 },
        Sub18: { minExclusive: 90, maxInclusive: 100 },
      },
      female: {
        Sub9: { minExclusive: 45, maxInclusive: 50 },
        Sub11: { minExclusive: 50, maxInclusive: 55 },
        Sub13: { minExclusive: 52, maxInclusive: 60 },
        Sub15: { minExclusive: 63, maxInclusive: 70 },
        Sub18: { minExclusive: 70, maxInclusive: 74 },
      },
    },
  },
  {
    key: 'SuperPesado',
    label: 'Super Pesado',
    ranges: {
      male: {
        Sub9: { minExclusive: 50 },
        Sub11: { minExclusive: 55 },
        Sub13: { minExclusive: 60 },
        Sub15: { minExclusive: 81 },
        Sub18: { minExclusive: 100 },
      },
      female: {
        Sub9: { minExclusive: 50 },
        Sub11: { minExclusive: 55 },
        Sub13: { minExclusive: 60 },
        Sub15: { minExclusive: 70 },
        Sub18: { minExclusive: 74 },
      },
    },
  },
];

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const computeAge = (birthdate, refDate) => {
  const birth = parseDate(birthdate);
  if (!birth) return null;
  let ref = refDate;
  if (!(ref instanceof Date)) {
    ref = parseDate(refDate);
  }
  if (!ref) return null;
  // Age is calculated only by the difference in years, ignoring months and days
  const age = ref.getFullYear() - birth.getFullYear();
  return age;
};

const normalizeGender = (gender) => {
  if (!gender) return null;
  const value = String(gender).trim().toLowerCase();
  if (value === 'masculino' || value === 'male') return 'male';
  if (value === 'feminino' || value === 'female') return 'female';
  return null;
};

const normalizeGenderValue = (gender) => {
  if (!gender) return null;
  const value = String(gender).trim().toLowerCase();
  if (value === 'masculino' || value === 'male') return 'masculino';
  if (value === 'feminino' || value === 'female') return 'feminino';
  return null;
};

const getWeightRange = (weightKey, ageKey, gender) => {
  const weightCat = weightCategories.find((item) => item.key === weightKey);
  if (!weightCat) return null;

  const normalizedGender = normalizeGender(gender);
  if (!normalizedGender) return null;

  return weightCat.ranges?.[normalizedGender]?.[ageKey] || null;
};

const matchesWeightRange = (weight, range) => {
  if (!range) return false;
  if (typeof range.minExclusive === 'number' && weight <= range.minExclusive) return false;
  if (typeof range.maxInclusive === 'number' && weight > range.maxInclusive) return false;
  return true;
};

const categoryMatches = (athlete, tourneyDate, ageKey, weightKey, gender) => {
  const ageCat = ageCategories.find((item) => item.key === ageKey);
  if (!ageCat) return false;

  const normalizedAthleteGender = normalizeGender(athlete.gender);
  const normalizedTargetGender = normalizeGender(gender);

  // Festival has no gender or weight divisions.
  if (ageCat.key !== 'Festival') {
    if (!normalizedAthleteGender || !normalizedTargetGender || normalizedAthleteGender !== normalizedTargetGender) {
      return false;
    }
  }

  const age = computeAge(athlete.birthdate, tourneyDate);
  if (age === null) return false;
  if (age < ageCat.minAge || age > ageCat.maxAge) return false;

  // Senior ignores weight but still uses gender matching; Festival ignores both.
  if (ageCat.key === 'Festival' || ageCat.key === 'Senior') return true;

  const weight = Number(athlete.weight);
  if (Number.isNaN(weight)) return false;

  const range = getWeightRange(weightKey, ageKey, normalizedAthleteGender);
  return matchesWeightRange(weight, range);
};

const checkAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

const checkAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).render('error', { user: req.user, message: 'Acesso negado. Apenas administradores podem acessar.' });
  }
  next();
};

const getAccessibleAthletes = async (user) => {
  if (user && user.isAdmin) {
    return all('SELECT * FROM athletes ORDER BY name');
  }

  return all('SELECT * FROM athletes WHERE user_id = ? ORDER BY name', [user.id]);
};

const getAthleteForUser = async (athleteId, user) => {
  if (user && user.isAdmin) {
    return get('SELECT * FROM athletes WHERE id = ?', [athleteId]);
  }

  return get('SELECT * FROM athletes WHERE id = ? AND user_id = ?', [athleteId, user.id]);
};

const getFightForUser = async (fightId, tourneyId, user) => {
  if (user && user.isAdmin) {
    return get('SELECT * FROM fights WHERE id = ? AND tourney_id = ?', [fightId, tourneyId]);
  }

  return get('SELECT * FROM fights WHERE id = ? AND tourney_id = ? AND created_by = ?', [fightId, tourneyId, user.id]);
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const row = await get('SELECT id, email, name, academy, isAdmin FROM users WHERE id = ?', [req.session.userId]);
      if (row) row.isAdmin = !!row.isAdmin;
      req.user = row;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { message: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { message: 'Por favor preencha ambos os campos.' });
  }

  try {
    const user = await get('SELECT id, password_hash FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.render('login', { message: 'Email ou senha inválidos.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.render('login', { message: 'Email ou senha inválidos.' });
    }

    req.session.userId = user.id;
    res.redirect('/dashboard');
  } catch (err) {
    res.render('login', { message: 'Falha ao entrar. Tente novamente.' });
  }
});

app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { message: null });
});

app.post('/register', async (req, res) => {
  const { email, password, confirmPassword, name, academy } = req.body;
  if (!email || !password || !confirmPassword || !name) {
    return res.render('register', { message: 'Por favor preencha todos os campos obrigatórios.' });
  }
  if (password !== confirmPassword) {
    return res.render('register', { message: 'As senhas não coincidem.' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 12);
    const result = await run(
      'INSERT INTO users (email, password_hash, name, academy) VALUES (?, ?, ?, ?)',
      [email.trim().toLowerCase(), password_hash, name.trim(), (academy || '').trim()]
    );
    // make first user an admin
    const usersCountRow = await get('SELECT COUNT(*) as cnt FROM users');
    if (usersCountRow && usersCountRow.cnt === 1) {
      await run('UPDATE users SET isAdmin = 1 WHERE id = ?', [result.id]);
    }
    req.session.userId = result.id;
    res.redirect('/dashboard');
  } catch (err) {
    if (err && err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.render('register', { message: 'Email já está registrado.' });
    }
    res.render('register', { message: 'Falha ao registrar. Tente novamente.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get('/dashboard', checkAuth, async (req, res, next) => {
  try {
    const tourneys = await all('SELECT * FROM tourneys ORDER BY date');
    res.render('dashboard', { user: req.user, tourneys });
  } catch (err) {
    next(err);
  }
});

app.get('/profile', checkAuth, async (req, res, next) => {
  try {
    const athletes = await all('SELECT * FROM athletes WHERE user_id = ? ORDER BY name', [req.user.id]);
    res.render('profile', { user: req.user, athletes, message: null });
  } catch (err) {
    next(err);
  }
});

app.post('/profile', checkAuth, async (req, res, next) => {
  const { name, academy } = req.body;
  if (!name) {
    const athletes = await all('SELECT * FROM athletes WHERE user_id = ? ORDER BY name', [req.user.id]);
    return res.render('profile', { user: req.user, athletes, message: 'Seu nome não pode ficar vazio.' });
  }
  try {
    await run('UPDATE users SET name = ?, academy = ? WHERE id = ?', [name.trim(), (academy || '').trim(), req.user.id]);
    req.user.name = name.trim();
    req.user.academy = (academy || '').trim();
    const athletes = await all('SELECT * FROM athletes WHERE user_id = ? ORDER BY name', [req.user.id]);
    res.render('profile', { user: req.user, athletes, message: 'Perfil atualizado com sucesso.' });
  } catch (err) {
    next(err);
  }
});

app.post('/athletes/save', checkAuth, async (req, res, next) => {
  const { id, name, gender, birthdate, weight, belt } = req.body;
  const normalizedGender = normalizeGenderValue(gender);
  if (!name || !normalizedGender || !birthdate || !weight || !belt) {
    const athletes = await all('SELECT * FROM athletes WHERE user_id = ? ORDER BY name', [req.user.id]);
    return res.render('profile', { user: req.user, athletes, message: 'Por favor preencha todos os campos.' });
  }

  try {
    if (id) {
      await run(
        'UPDATE athletes SET name = ?, gender = ?, birthdate = ?, weight = ?, belt = ? WHERE id = ? AND user_id = ?',
        [name.trim(), normalizedGender, birthdate, Number(weight), belt.trim(), id, req.user.id]
      );
    } else {
      await run(
        'INSERT INTO athletes (user_id, name, gender, birthdate, weight, belt) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, name.trim(), normalizedGender, birthdate, Number(weight), belt.trim()]
      );
    }
    res.redirect('/profile');
  } catch (err) {
    next(err);
  }
});

app.post('/athletes/delete', checkAuth, async (req, res, next) => {
  const { id } = req.body;
  if (!id) {
    return res.redirect('/profile');
  }
  try {
    await run('DELETE FROM athletes WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.redirect('/profile');
  } catch (err) {
    next(err);
  }
});

app.get('/tourney/:id', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);

  try {
    const tourney = await get('SELECT * FROM tourneys WHERE id = ?', [tourneyId]);
    if (!tourney) {
      return res.status(404).render('404', { user: req.user });
    }

    const athletes = await all('SELECT * FROM athletes WHERE user_id = ? ORDER BY name', [req.user.id]);
    const userRegistrations = await all(
      'SELECT r.id, r.athlete_id, r.age_category, r.weight_category, r.gender, a.name FROM registrations r JOIN athletes a ON r.athlete_id = a.id WHERE r.tourney_id = ? AND a.user_id = ?',
      [tourneyId, req.user.id]
    );
    const allRegistrations = await all(
      `SELECT r.id, r.athlete_id, r.age_category, r.weight_category, r.gender,
              a.name AS athlete_name, a.belt, u.name AS sensei_name, u.academy
       FROM registrations r
       JOIN athletes a ON r.athlete_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE r.tourney_id = ?
       ORDER BY r.age_category, r.weight_category, a.name`,
      [tourneyId]
    );

    res.render('tourney', {
      user: req.user,
      tourney,
      ageCategories,
      weightCategories,
      athletes,
      userRegistrations,
      allRegistrations,
      categoryMatches,
      normalizeGender,
      parseDate,
      message: null,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/tourney/:id/register', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);
  const { athleteId, ageCategory, weightCategory } = req.body;
  // Festival and Senior do not require a weight category; other categories do.
  if (!athleteId || !ageCategory || (ageCategory !== 'Festival' && ageCategory !== 'Senior' && !weightCategory)) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
    return res.redirect(`/tourney/${tourneyId}`);
  }

  try {
    const tourney = await get('SELECT * FROM tourneys WHERE id = ?', [tourneyId]);
    if (!tourney) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.status(404).json({ success: false });
      return res.status(404).render('404', { user: req.user });
    }

    const athlete = await get('SELECT * FROM athletes WHERE id = ? AND user_id = ?', [athleteId, req.user.id]);
    if (!athlete) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
      return res.redirect(`/tourney/${tourneyId}`);
    }

    if (!categoryMatches(athlete, parseDate(tourney.date), ageCategory, weightCategory, athlete.gender)) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
      return res.redirect(`/tourney/${tourneyId}`);
    }

    const registrationGender = normalizeGenderValue(athlete.gender);
    if (!registrationGender) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
      return res.redirect(`/tourney/${tourneyId}`);
    }
    const result = await run(
      'INSERT OR IGNORE INTO registrations (athlete_id, tourney_id, age_category, weight_category, gender) VALUES (?, ?, ?, ?, ?)',
      [athlete.id, tourneyId, ageCategory, weightCategory, registrationGender]
    );

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      const coach = await get('SELECT name AS sensei_name, academy FROM users WHERE id = ?', [athlete.user_id]);
      return res.json({
        success: true,
        registrationId: result.id,
        athleteId: athlete.id,
        name: athlete.name,
        gender: athlete.gender,
        belt: athlete.belt || '',
        sensei_name: coach ? coach.sensei_name : '',
        academy: coach ? coach.academy : '',
        ageCategory,
        weightCategory,
      });
    }
    res.redirect(`/tourney/${tourneyId}`);
  } catch (err) {
    next(err);
  }
});

app.post('/tourney/:id/unregister', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);
  const { registrationId } = req.body;
  if (!registrationId) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
    return res.redirect(`/tourney/${tourneyId}`);
  }
  try {
    await run('DELETE FROM registrations WHERE id = ? AND tourney_id = ?', [registrationId, tourneyId]);
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: true, registrationId });
    res.redirect(`/tourney/${tourneyId}`);
  } catch (err) {
    next(err);
  }
});

// Lutas casadas - listagem e criação
app.get('/tourney/:id/lutas', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);
  try {
    const tourney = await get('SELECT * FROM tourneys WHERE id = ?', [tourneyId]);
    if (!tourney) return res.status(404).render('404', { user: req.user });

    const athletes = await getAccessibleAthletes(req.user);
    const fights = await all(
      `SELECT f.id, f.athlete_a_id, f.athlete_b_id, a1.name AS athleteA, a2.name AS athleteB, f.created_at
       FROM fights f
       LEFT JOIN athletes a1 ON f.athlete_a_id = a1.id
       LEFT JOIN athletes a2 ON f.athlete_b_id = a2.id
       WHERE f.tourney_id = ?
       ORDER BY f.id`,
      [tourneyId]
    );

    res.render('tourney-lutas', { user: req.user, tourney, athletes, fights, message: null });
  } catch (err) {
    next(err);
  }
});

app.post('/tourney/:id/lutas', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);
  // Allow creating a fight with at least one athlete (the other can be null)
  let { athleteAId, athleteBId } = req.body;
  athleteAId = athleteAId ? String(athleteAId).trim() : '';
  athleteBId = athleteBId ? String(athleteBId).trim() : '';
  if (!athleteAId && !athleteBId) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
    return res.redirect(`/tourney/${tourneyId}/lutas`);
  }
  if (athleteAId && athleteBId && athleteAId === athleteBId) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false, message: 'Não é possível casar um atleta com ele mesmo.' });
    return res.redirect(`/tourney/${tourneyId}/lutas`);
  }
  try {
    // Validate provided athlete ids (if present)
    if (athleteAId) {
      const a1 = await getAthleteForUser(athleteAId, req.user);
      if (!a1) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
        return res.redirect(`/tourney/${tourneyId}/lutas`);
      }
    }
    if (athleteBId) {
      const a2 = await getAthleteForUser(athleteBId, req.user);
      if (!a2) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
        return res.redirect(`/tourney/${tourneyId}/lutas`);
      }
    }

    const result = await run(
      'INSERT INTO fights (tourney_id, athlete_a_id, athlete_b_id, created_by) VALUES (?, ?, ?, ?)',
      [tourneyId, athleteAId || null, athleteBId || null, req.user ? req.user.id : null]
    );

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, fightId: result.id });
    }
    res.redirect(`/tourney/${tourneyId}/lutas`);
  } catch (err) {
    next(err);
  }
});

app.post('/tourney/:id/lutas/delete', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);
  const { fightId } = req.body;
  if (!fightId) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
    return res.redirect(`/tourney/${tourneyId}/lutas`);
  }
  try {
    const fight = await getFightForUser(fightId, tourneyId, req.user);
    if (!fight) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
      return res.redirect(`/tourney/${tourneyId}/lutas`);
    }

    await run('DELETE FROM fights WHERE id = ? AND tourney_id = ?', [fightId, tourneyId]);
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: true });
    res.redirect(`/tourney/${tourneyId}/lutas`);
  } catch (err) {
    next(err);
  }
});

// Adicionar adversário a uma luta existente (preenchimento do slot vazio)
app.post('/tourney/:id/lutas/:fightId/add', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);
  const fightId = Number(req.params.fightId);
  const { opponentId } = req.body;
  if (!opponentId) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
    return res.redirect(`/tourney/${tourneyId}/lutas`);
  }
  try {
    const fight = await getFightForUser(fightId, tourneyId, req.user);
    if (!fight) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
      return res.redirect(`/tourney/${tourneyId}/lutas`);
    }
    const opponent = await getAthleteForUser(opponentId, req.user);
    if (!opponent) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false });
      return res.redirect(`/tourney/${tourneyId}/lutas`);
    }
    // Determine which slot is empty and update it. Prevent matching same athlete.
    if (fight.athlete_a_id && fight.athlete_b_id) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false, message: 'Essa luta já está completa.' });
      return res.redirect(`/tourney/${tourneyId}/lutas`);
    }
    if (fight.athlete_a_id && Number(fight.athlete_a_id) === Number(opponentId)) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false, message: 'Não é possível casar um atleta com ele mesmo.' });
      return res.redirect(`/tourney/${tourneyId}/lutas`);
    }
    if (fight.athlete_b_id && Number(fight.athlete_b_id) === Number(opponentId)) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: false, message: 'Não é possível casar um atleta com ele mesmo.' });
      return res.redirect(`/tourney/${tourneyId}/lutas`);
    }

    if (!fight.athlete_a_id) {
      await run('UPDATE fights SET athlete_a_id = ? WHERE id = ?', [opponentId, fightId]);
    } else {
      await run('UPDATE fights SET athlete_b_id = ? WHERE id = ?', [opponentId, fightId]);
    }

    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.json({ success: true });
    return res.redirect(`/tourney/${tourneyId}/lutas`);
  } catch (err) {
    next(err);
  }
});

app.get('/admin', checkAuth, checkAdmin, async (req, res, next) => {
  try {
    const tourneys = await all('SELECT * FROM tourneys ORDER BY date DESC');
    res.render('admin', { user: req.user, tourneys, message: null });
  } catch (err) {
    next(err);
  }
});

app.get('/admin/tourney/new', checkAuth, checkAdmin, (req, res) => {
  res.render('admin-tourney-form', { user: req.user, tourney: null, message: null });
});

app.post('/admin/tourney', checkAuth, checkAdmin, async (req, res, next) => {
  const { name, date, location, description } = req.body;
  if (!name || !date || !location) {
    return res.render('admin-tourney-form', { user: req.user, tourney: null, message: 'Por favor preencha todos os campos obrigatórios.' });
  }
  try {
    await run(
      'INSERT INTO tourneys (name, date, location, description) VALUES (?, ?, ?, ?)',
      [name.trim(), date, location.trim(), (description || '').trim()]
    );
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.get('/admin/tourney/:id/edit', checkAuth, checkAdmin, async (req, res, next) => {
  try {
    const tourney = await get('SELECT * FROM tourneys WHERE id = ?', [req.params.id]);
    if (!tourney) {
      return res.status(404).render('404', { user: req.user });
    }
    res.render('admin-tourney-form', { user: req.user, tourney, message: null });
  } catch (err) {
    next(err);
  }
});

app.post('/admin/tourney/:id/edit', checkAuth, checkAdmin, async (req, res, next) => {
  const { name, date, location, description } = req.body;
  if (!name || !date || !location) {
    const tourney = await get('SELECT * FROM tourneys WHERE id = ?', [req.params.id]);
    return res.render('admin-tourney-form', { user: req.user, tourney, message: 'Por favor preencha todos os campos obrigatórios.' });
  }
  try {
    await run(
      'UPDATE tourneys SET name = ?, date = ?, location = ?, description = ? WHERE id = ?',
      [name.trim(), date, location.trim(), (description || '').trim(), req.params.id]
    );
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/tourney/:id/delete', checkAuth, checkAdmin, async (req, res, next) => {
  try {
    await run('DELETE FROM tourneys WHERE id = ?', [req.params.id]);
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.get('/tourney/:id/pdf', checkAuth, async (req, res, next) => {
  const tourneyId = Number(req.params.id);
  try {
    const tourney = await get('SELECT * FROM tourneys WHERE id = ?', [tourneyId]);
    if (!tourney) {
      return res.status(404).render('404', { user: req.user });
    }

    const registrations = await all(
      'SELECT a.name, a.gender, r.age_category, r.weight_category FROM registrations r JOIN athletes a ON r.athlete_id = a.id WHERE r.tourney_id = ? AND a.user_id = ? ORDER BY r.age_category, r.weight_category, a.name',
      [tourneyId, req.user.id]
    );

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${tourney.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_inscritos.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text(`${tourney.name}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Data: ${tourney.date}`);
    doc.text(`Local: ${tourney.location}`);
    doc.moveDown(1);
    doc.fontSize(14).text(`Atletas inscritos`, { underline: true });
    doc.moveDown(0.5);

    if (registrations.length === 0) {
      doc.text('Nenhum atleta inscrito ainda.');
    } else {
      registrations.forEach((item, index) => {
        doc.fontSize(12).text(
          `${index + 1}. ${item.name} — ${item.gender.charAt(0).toUpperCase() + item.gender.slice(1)} — ${item.age_category} / ${item.weight_category}`
        );
      });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).render('404', { user: req.user });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { user: req.user, message: 'An unexpected error occurred.' });
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });
