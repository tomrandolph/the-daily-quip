WITH matched_player_1 AS (
    SELECT
        player_id,
        (ROW_NUMBER() OVER (ORDER BY player_id)-1) AS round
    FROM
        game_players
    WHERE game_id = 2
), matched_player_2 AS (
    SELECT
        player_id,
        (ROW_NUMBER() OVER (ORDER BY player_id) % ( COUNT(*) OVER ())) AS round

    FROM
        game_players
    WHERE game_id = 2
), random_prompts AS (
    SELECT
        id,
        (ROW_NUMBER() OVER (ORDER BY RANDOM())-1) AS round
    FROM
        prompts
), player_matches AS (
    SELECT *
    FROM matched_player_1
    UNION
    SELECT *
    FROM matched_player_2
)
INSERT INTO submissions (game_id, player_id, prompt_id) (
    SELECT
        2 as game_id,
        player_id,
        random_prompts.id as prompt_id
    FROM player_matches
    LEFT JOIN random_prompts ON player_matches.round = random_prompts.round
);
-- SELECT player_matches.*, random_prompts.id as prompt_id, 2 as game_id FROM player_matches LEFT JOIN random_prompts ON player_matches.round = random_prompts.round;
-- ), second_pair AS (
--     SELECT
--         id,
--         (rn +2)  % total_count AS rn
--     FROM
--         ordered_players
-- ), random_prompts AS (
--     SELECT
--         id,
--         (ROW_NUMBER() OVER (ORDER BY RANDOM())) AS rn
--     FROM
--         prompts
-- ), pairs AS (
--     SELECT ordered_players.id as player_1_id, first_pair.id AS player_2_id, ordered_players.rn
--     FROM ordered_players
--     JOIN first_pair ON ordered_players.rn -1 = first_pair.rn
--     UNION
--     SELECT ordered_players.id as player_1_id, second_pair.id AS player_2_id, ordered_players.rn
--     FROM ordered_players
--     JOIN second_pair ON ordered_players.rn -1 = second_pair.rn
--     ORDER BY player_1_id, player_2_id
-- ), rn_pairs AS (
--     SELECT pairs.* FROM pairs
--     WHERE player_1_id != player_2_id
-- )
-- SELECT rn, id FROM first_pair;
-- SELECT rn, id FROM ordered_players;
-- 
-- SELECT ordered_players.id as player_1_id, first_pair.id AS player_2_id, ordered_players.rn
--     FROM ordered_players
--     JOIN first_pair ON ordered_players.rn  = first_pair.rn;
-- INSERT INTO rounds (player_1_id, player_2_id, prompt_id, game_id) (
    -- SELECT
    --     rn_pairs.*,
    --     -- player_1_id,
    --     -- player_2_id,
    --     random_prompts.id AS prompt_id,
    --     2 as game_id
    -- FROM rn_pairs
    -- LEFT JOIN random_prompts ON rn_pairs.rn = random_prompts.rn;
-- );

-- WITH ordered_players AS (
--     SELECT
--         id,
--         (ROW_NUMBER() OVER (ORDER BY id)) AS rn,
--         COUNT(*) OVER () AS total_count
--     FROM
--         players
-- ), first_pair AS (
--     SELECT
--         id,
--         (rn +1)  % total_count AS rn
--     FROM
--         ordered_players
-- ),second_pair AS (
--     SELECT
--         id,
--         (rn +2)  % total_count AS rn
--     FROM
--         ordered_players
-- ), random_prompts AS (
--     SELECT
--         id,
--         (ROW_NUMBER() OVER (ORDER BY RANDOM())) AS rn
--     FROM
--         prompts
-- ), pairs AS (
--     SELECT ordered_players.id as player_1_id, first_pair.id AS player_2_id
--     FROM ordered_players
--     JOIN first_pair ON ordered_players.rn -1 = first_pair.rn
--     UNION
--     SELECT ordered_players.id as player_1_id, second_pair.id AS player_2_id
--     FROM ordered_players
--     JOIN second_pair ON ordered_players.rn -1 = second_pair.rn
--     ORDER BY player_1_id, player_2_id
-- ), rn_pairs AS (
-- SELECT  (ROW_NUMBER() OVER ()) AS rnn,
-- pairs.* FROM pairs
-- ) 
-- INSERT INTO turns (player_1_id, player_2_id, prompt_id) (
-- SELECT
--     player_1_id,
--     player_2_id,
--     random_prompts.id AS prompt_id
-- FROM rn_pairs
-- LEFT JOIN random_prompts ON rnn = random_prompts.rn);

-- -- WITH RankedPlayers AS (
-- --     SELECT
-- --         id,
-- --         ROW_NUMBER() OVER (ORDER BY RANDOM()) AS rn -- Provides a random order
-- --     FROM
-- --         players
-- -- ),
-- -- Pairings AS (
-- --     SELECT
-- --         a.id AS player1_id,
-- --         b.id AS player2_id,
-- --         a.rn AS row_num
-- --     FROM
-- --         RankedPlayers a
-- --     JOIN
-- --         RankedPlayers b ON a.rn <> b.rn AND b.rn % (SELECT COUNT(*) FROM RankedPlayers) NOT IN (a.rn, a.rn - 1, a.rn + 1) -- Ensures no self-pairing and adjacent row pairing
-- -- )
-- -- SELECT
-- --     p1.player1_id,
-- --     p1.player2_id AS first_pair,
-- --     p2.player2_id AS second_pair
-- -- FROM
-- --     Pairings p1
-- -- JOIN
-- --     Pairings p2 ON p1.player1_id = p2.player1_id AND p1.player2_id <> p2.player2_id
-- -- WHERE
-- --     p1.row_num % 2 = 1 -- Ensures pairs are generated starting from odd rows
-- -- ORDER BY
-- --     p1.player1_id;


-- -- WITH numbered_players AS (
-- --     SELECT
-- --         id,
-- --         ROW_NUMBER() OVER (ORDER BY id) AS rn,
-- --         COUNT(*) OVER () AS total_count
-- --     FROM
-- --         players
-- -- )
-- -- SELECT
-- --     SELECT (),
-- --     name
-- -- FROM numbered_players
-- -- ORDER BY
-- --     rn;
-- -- WITH OrderedPlayers AS (
-- --     SELECT
-- --         id,
-- --         LEAD(id, 1) OVER (ORDER BY id) AS next_id,
-- --         LEAD(id, 2) OVER (ORDER BY id) AS next_next_id
-- --     FROM
-- --         players
-- -- )
-- -- SELECT
-- --     id,
-- --     next_id,
-- --     next_next_id
-- -- FROM
-- --     OrderedPlayers
-- -- WHERE
-- --     next_next_id IS NOT NULL; -- This filters out the last two players who do not have two subsequent players
-- -- WITH OrderedPlayers AS (
-- --     SELECT
-- --         id,
-- --         ROW_NUMBER() OVER (ORDER BY id) AS rn,  -- Assign row numbers
-- --         COUNT(*) OVER () AS total_count                -- Get the total count of rows
-- --     FROM
-- --         players
-- -- ),
-- -- WrappedPlayers AS (
-- --     SELECT
-- --         id,
-- --         CASE 
-- --             WHEN rn + 1 > total_count THEN (SELECT id FROM OrderedPlayers ORDER BY rn) -- Wrap to first player if end of list is reached
-- --             ELSE LEAD(id, 1) OVER (ORDER BY id)
-- --         END AS next_id,
-- --         CASE 
-- --             WHEN rn + 2 > total_count THEN LEAD(id, 2 - total_count) OVER (ORDER BY id)
-- --             ELSE LEAD(id, 2) OVER (ORDER BY id)
-- --         END AS next_next_id
-- --     FROM
-- --         OrderedPlayers
-- -- )
-- -- SELECT
-- --     id,
-- --     next_id,
-- --     next_next_id
-- -- FROM
-- --     WrappedPlayers;
