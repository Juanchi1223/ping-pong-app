const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

let supabase;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !process.env.USE_MOCK_DB) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
} else {
  // In-memory mock database for testing and standalone local development
  class MockQueryBuilder {
    constructor(tableName, dataStore) {
      this.tableName = tableName;
      this.store = dataStore;
      this.filters = [];
      this.neqFilters = [];
      this.orFilters = [];
      this.inFilters = [];
      this.orderRules = [];
      this.selectFields = '*';
      this.action = 'select';
      this.payload = null;
    }

    select(fields = '*') {
      this.selectFields = fields;
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, value });
      return this;
    }

    neq(column, value) {
      this.neqFilters.push({ column, value });
      return this;
    }

    in(column, values) {
      this.inFilters.push({ column, values });
      return this;
    }

    or(filterStr) {
      this.orFilters.push(filterStr);
      return this;
    }

    order(column, { ascending = true } = {}) {
      this.orderRules.push({ column, ascending });
      return this;
    }

    insert(data) {
      this.action = 'insert';
      this.payload = data;
      return this;
    }

    update(data) {
      this.action = 'update';
      this.payload = data;
      return this;
    }

    delete() {
      this.action = 'delete';
      return this;
    }

    async then(resolve, reject) {
      try {
        const res = await this._execute();
        resolve(res);
      } catch (err) {
        if (reject) reject(err);
        else throw err;
      }
    }

    async single() {
      const res = await this._execute();
      if (res.error) return res;
      if (Array.isArray(res.data)) {
        if (res.data.length === 0) return { data: null, error: { message: 'Row not found' } };
        return { data: res.data[0], error: null };
      }
      return res;
    }

    async maybeSingle() {
      const res = await this._execute();
      if (res.error) return res;
      if (Array.isArray(res.data)) {
        return { data: res.data[0] || null, error: null };
      }
      return res;
    }

    async _execute() {
      let table = this.store[this.tableName];
      if (!table) {
        this.store[this.tableName] = [];
        table = this.store[this.tableName];
      }

      if (this.action === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = [];
        for (const item of items) {
          if (this.tableName === 'players' && item.name) {
            const exists = table.some(p => p.name.toLowerCase() === item.name.toLowerCase());
            if (exists) {
              return { data: null, error: { code: '23505', message: 'Player name already exists' } };
            }
          }
          const id = item.id || (table.length ? Math.max(...table.map(r => Number(r.id) || 0)) + 1 : 1);
          const record = {
            id,
            active: true,
            mmr: 1200,
            wins: 0,
            losses: 0,
            points_scored: 0,
            points_conceded: 0,
            current_win_streak: 0,
            current_loss_streak: 0,
            created_at: new Date().toISOString(),
            played_at: new Date().toISOString(),
            season: 1,
            mode: '1v1',
            player_a2_id: null,
            player_b2_id: null,
            ...item,
          };
          table.push(record);
          inserted.push(record);
        }
        return { data: Array.isArray(this.payload) ? inserted : inserted[0], error: null };
      }

      if (this.action === 'update') {
        const matches = this._filter(table);
        matches.forEach(m => Object.assign(m, this.payload));
        return { data: matches, error: null };
      }

      if (this.action === 'delete') {
        const matches = this._filter(table);
        this.store[this.tableName] = table.filter(row => !matches.includes(row));
        return { data: matches, error: null };
      }

      // Action: select
      let results = this._filter(table).map(r => ({ ...r }));

      for (const rule of this.orderRules) {
        results.sort((a, b) => {
          const valA = a[rule.column];
          const valB = b[rule.column];
          if (valA < valB) return rule.ascending ? -1 : 1;
          if (valA > valB) return rule.ascending ? 1 : -1;
          return 0;
        });
      }

      return { data: results, error: null };
    }

    _filter(table) {
      return table.filter(row => {
        for (const f of this.filters) {
          if (row[f.column] !== f.value && Number(row[f.column]) !== Number(f.value)) {
            return false;
          }
        }
        for (const f of this.neqFilters) {
          if (row[f.column] === f.value || Number(row[f.column]) === Number(f.value)) {
            return false;
          }
        }
        for (const f of this.inFilters) {
          if (!f.values.some(v => Number(v) === Number(row[f.column]) || v === row[f.column])) {
            return false;
          }
        }
        if (this.orFilters.length) {
          const matchOr = this.orFilters.some(orExpr => {
            const parts = orExpr.split(',');
            return parts.some(part => {
              const [col, op, val] = part.split('.');
              if (op === 'eq') {
                return Number(row[col]) === Number(val) || row[col] === val;
              }
              return false;
            });
          });
          if (!matchOr) return false;
        }
        return true;
      });
    }
  }

  function getInitialStore() {
    return {
      players: [
        { id: 1, name: 'Carmen Wu', department: 'Design', mmr: 1200, wins: 0, losses: 0, points_scored: 0, points_conceded: 0, current_win_streak: 0, current_loss_streak: 0, active: true, created_at: new Date().toISOString() },
        { id: 2, name: 'Alex Rivera', department: 'Engineering', mmr: 1200, wins: 0, losses: 0, points_scored: 0, points_conceded: 0, current_win_streak: 0, current_loss_streak: 0, active: true, created_at: new Date().toISOString() },
        { id: 3, name: 'Elena Rostova', department: 'Product', mmr: 1200, wins: 0, losses: 0, points_scored: 0, points_conceded: 0, current_win_streak: 0, current_loss_streak: 0, active: true, created_at: new Date().toISOString() },
        { id: 4, name: 'Marcus Chen', department: 'Sales', mmr: 1200, wins: 0, losses: 0, points_scored: 0, points_conceded: 0, current_win_streak: 0, current_loss_streak: 0, active: true, created_at: new Date().toISOString() },
      ],
      matches: [
        { id: 1, player_a_id: 1, player_b_id: 2, player_a2_id: null, player_b2_id: null, score_a: 11, score_b: 8, mmr_delta_a: 16, mmr_delta_b: -16, mode: '1v1', season: 1, played_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 2, player_a_id: 3, player_b_id: 4, player_a2_id: null, player_b2_id: null, score_a: 11, score_b: 7, mmr_delta_a: 16, mmr_delta_b: -16, mode: '1v1', season: 1, played_at: new Date(Date.now() - 86400000).toISOString() },
      ],
      seasons: [
        { id: 1, name: 'Season 1', active: false, status: 'archived', baseline_mmr: 1200, started_at: '2026-01-01T00:00:00Z', ended_at: new Date().toISOString() },
        { id: 2, name: 'Season 2', active: true, status: 'active', baseline_mmr: 1200, started_at: new Date().toISOString(), ended_at: null },
      ],
    };
  }

  supabase = {
    _store: getInitialStore(),
    _reset: () => {
      supabase._store = getInitialStore();
    },
    from: (tableName) => new MockQueryBuilder(tableName, supabase._store),
  };
}

module.exports = { supabase };
