const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'sqlite3',
  connection: { filename: process.env.DATABASE_PATH || path.join(__dirname, 'pingpong.db') },
  useNullAsDefault: true,
});

async function initDb() {
  const hasPlayers = await db.schema.hasTable('players');
  if (!hasPlayers) {
    await db.schema.createTable('players', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable().unique();
      t.integer('mmr').notNullable().defaultTo(1000);
      t.integer('wins').notNullable().defaultTo(0);
      t.integer('losses').notNullable().defaultTo(0);
      t.integer('points_scored').notNullable().defaultTo(0);
      t.integer('points_conceded').notNullable().defaultTo(0);
      t.integer('current_win_streak').notNullable().defaultTo(0);
      t.integer('current_loss_streak').notNullable().defaultTo(0);
      t.integer('active').notNullable().defaultTo(1);
      t.string('created_at').notNullable().defaultTo(db.fn.now());
    });
  }

  const hasMatches = await db.schema.hasTable('matches');
  if (!hasMatches) {
    await db.schema.createTable('matches', (t) => {
      t.increments('id').primary();
      t.integer('player_a_id').notNullable().references('id').inTable('players');
      t.integer('player_b_id').notNullable().references('id').inTable('players');
      t.integer('score_a').notNullable();
      t.integer('score_b').notNullable();
      t.integer('mmr_delta_a').notNullable();
      t.integer('mmr_delta_b').notNullable();
      t.string('played_at').notNullable().defaultTo(db.fn.now());
    });
  }
}

module.exports = { db, initDb };
