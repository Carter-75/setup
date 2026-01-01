"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./page.module.css";

type Player = {
  id: number;
  name: string;
  balance: number;
  color: string;
};

const DENOMINATIONS = [1, 5, 10, 20, 50, 100, 500];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const STARTING_BALANCE = 1500;
const BANK_ID = "bank";
const TAX_ID = "tax";
const PLAYER_COLORS = ["#ffb347", "#5dd6c1", "#6ea8ff", "#f970b7"] as const;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const playerKey = (id: number) => `player-${id}`;

const createPlayer = (id: number): Player => ({
  id,
  name: `Player ${id}`,
  balance: STARTING_BALANCE,
  color: PLAYER_COLORS[(id - 1) % PLAYER_COLORS.length],
});

export default function Home() {
  const [players, setPlayers] = useState<Player[]>(() =>
    Array.from({ length: MAX_PLAYERS }, (_, index) => createPlayer(index + 1))
  );
  const [taxBalance, setTaxBalance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [sourceId, setSourceId] = useState<string>(BANK_ID);
  const [targetId, setTargetId] = useState<string>(playerKey(1));
  const [feedback, setFeedback] = useState<string | null>(null);

  const nameResetTimers = useRef<
    Partial<Record<number, ReturnType<typeof setTimeout>>>
  >({});

  const activePlayers = players;

  const clearScheduledReset = (id: number) => {
    const pending = nameResetTimers.current[id];
    if (pending) {
      clearTimeout(pending);
      delete nameResetTimers.current[id];
    }
  };

  const scheduleNameReset = (id: number) => {
    clearScheduledReset(id);
    nameResetTimers.current[id] = setTimeout(() => {
      setPlayers((previous) =>
        previous.map((player) =>
          player.id === id && player.name.trim() === ""
            ? { ...player, name: `Player ${id}` }
            : player
        )
      );
      delete nameResetTimers.current[id];
    }, 3000);
  };

  const clearAllNameResetTimers = useCallback(() => {
    Object.values(nameResetTimers.current).forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }, [nameResetTimers]);

  const handlePlayerCountChange = (count: number) => {
    const normalized = Math.min(Math.max(count, MIN_PLAYERS), MAX_PLAYERS);
    setPlayers((previous) => {
      if (normalized > previous.length) {
        const additions = Array.from(
          { length: normalized - previous.length },
          (_, index) => createPlayer(previous.length + index + 1)
        );
        return [...previous, ...additions];
      }
      if (normalized < previous.length) {
        return previous.slice(0, normalized);
      }
      return previous;
    });
  };

  const playerCount = activePlayers.length;

  useEffect(() => {
    return () => {
      clearAllNameResetTimers();
    };
  }, [clearAllNameResetTimers]);

  useEffect(() => {
    const playerIds = new Set(
      activePlayers.map((player) => playerKey(player.id))
    );
    if (!playerIds.has(sourceId) && sourceId !== BANK_ID && sourceId !== TAX_ID) {
      const fallback = playerIds.values().next().value ?? BANK_ID;
      setSourceId(fallback);
    }
    if (!playerIds.has(targetId) && targetId !== BANK_ID && targetId !== TAX_ID) {
      const fallback = playerIds.values().next().value ?? TAX_ID;
      setTargetId(fallback);
    }
  }, [activePlayers, sourceId, targetId]);

  useEffect(() => {
    const activeIds = new Set(activePlayers.map((player) => player.id));
    Object.keys(nameResetTimers.current).forEach((key) => {
      const id = Number(key);
      if (!activeIds.has(id)) {
        clearScheduledReset(id);
      }
    });
  }, [activePlayers]);

  const playerOptions = activePlayers.map((player) => ({
    value: playerKey(player.id),
    label: `${player.name} (${formatCurrency(player.balance)})`,
  }));

  const accountOptions = [
    ...playerOptions,
    { value: TAX_ID, label: `Tax Pile (${formatCurrency(taxBalance)})` },
    { value: BANK_ID, label: "Bank (unlimited)" },
  ];

  const describeAccount = (id: string) => {
    if (id === BANK_ID) {
      return "the bank";
    }
    if (id === TAX_ID) {
      return "the tax pile";
    }
    const player = activePlayers.find((entry) => playerKey(entry.id) === id);
    return player ? player.name : "player";
  };

  const handlePlayerNameChange = (id: number, name: string) => {
    setPlayers((previous) =>
      previous.map((player) =>
        player.id === id
          ? {
              ...player,
              name,
            }
          : player
      )
    );

    if (name.trim() === "") {
      scheduleNameReset(id);
    } else {
      clearScheduledReset(id);
    }
  };

  const adjustPendingAmount = (delta: number) => {
    setPendingAmount((previous) => Math.max(0, previous + delta));
    setFeedback(null);
  };

  const handleSwapAccounts = () => {
    if (sourceId === targetId) {
      return;
    }
    setSourceId(targetId);
    setTargetId(sourceId);
    setFeedback(null);
  };

  const applyCustomAmount = () => {
    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFeedback("Enter a positive custom amount.");
      return;
    }
    setPendingAmount(parsed);
    setFeedback(null);
  };

  const resetAmount = () => {
    setPendingAmount(0);
    setCustomAmount("");
    setFeedback(null);
  };

  const findPlayer = (id: string) =>
    activePlayers.find((player) => playerKey(player.id) === id);

  const canDebit = (accountId: string, amount: number) => {
    if (accountId === BANK_ID) {
      return true;
    }
    if (accountId === TAX_ID) {
      return taxBalance >= amount;
    }
    const player = findPlayer(accountId);
    return !!player && player.balance >= amount;
  };

  const handleTransaction = () => {
    if (pendingAmount <= 0) {
      setFeedback("Choose an amount greater than zero.");
      return;
    }
    if (sourceId === targetId) {
      setFeedback("Pick different source and destination accounts.");
      return;
    }
    if (!canDebit(sourceId, pendingAmount)) {
      setFeedback("Insufficient funds in the selected source.");
      return;
    }

    setPlayers((previous) =>
      previous.map((player) => {
        const key = playerKey(player.id);
        let nextBalance = player.balance;
        if (key === sourceId) {
          nextBalance -= pendingAmount;
        }
        if (key === targetId) {
          nextBalance += pendingAmount;
        }
        return nextBalance === player.balance
          ? player
          : { ...player, balance: nextBalance };
      })
    );

    if (sourceId === TAX_ID) {
      setTaxBalance((previous) => previous - pendingAmount);
    }
    if (targetId === TAX_ID) {
      setTaxBalance((previous) => previous + pendingAmount);
    }

    setFeedback(
      `Moved ${formatCurrency(pendingAmount)} from ${describeAccount(
        sourceId
      )} to ${describeAccount(targetId)}.`
    );
  };

  return (
    <main className={styles.main}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Quick cash flow tracker</p>
            <h1>Monopoly Banker</h1>
            <p className={styles.subtitle}>
              Track 2&ndash;4 players, the tax pile, and an unlimited bank. Start
              everyone with {formatCurrency(STARTING_BALANCE)} and keep the game
              moving without pencil math.
            </p>
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.controls}>
            <div className={styles.card}>
              <div className={styles.fieldRow}>
                <label htmlFor="player-count">
                  Players: <strong>{playerCount}</strong>
                </label>
                <input
                  id="player-count"
                  type="range"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  value={playerCount}
                  onChange={(event) =>
                    handlePlayerCountChange(Number(event.target.value))
                  }
                />
              </div>
              <p className={styles.helper}>
                Bank is unlimited, tax pile starts at {formatCurrency(0)}, each
                player starts at {formatCurrency(STARTING_BALANCE)}.
              </p>
            </div>

            <div className={styles.card}>
              <h2>Adjust names</h2>
              <div className={styles.playerFormGrid}>
                {activePlayers.map((player) => (
                  <label key={player.id} className={styles.playerField}>
                    <span className={styles.playerLabel}>
                      <span
                        className={styles.swatch}
                        style={{ backgroundColor: player.color }}
                        aria-hidden="true"
                      />
                      Player {player.id}
                    </span>
                    <input
                      value={player.name}
                      maxLength={24}
                      onChange={(event) =>
                        handlePlayerNameChange(player.id, event.target.value)
                      }
                    />
                    <small>{formatCurrency(player.balance)}</small>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h2>Pick an amount</h2>
              <div className={styles.amountRow}>
                <div>
                  <p className={styles.amountLabel}>Pending amount</p>
                  <p className={styles.amountValue}>
                    {formatCurrency(pendingAmount)}
                  </p>
                </div>
                <button
                  className={styles.resetButton}
                  type="button"
                  onClick={resetAmount}
                >
                  Reset
                </button>
              </div>
              <div className={styles.denominationControls}>
                {DENOMINATIONS.map((value) => (
                  <div key={value} className={styles.denomination}>
                    <button
                      type="button"
                      onClick={() => adjustPendingAmount(-value)}
                    >
                      &minus;
                    </button>
                    <span>${value}</span>
                    <button
                      type="button"
                      onClick={() => adjustPendingAmount(value)}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.customAmount}>
                <label htmlFor="custom-amount">Custom amount</label>
                <div>
                  <input
                    id="custom-amount"
                    type="number"
                    min={1}
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                  />
                  <button type="button" onClick={applyCustomAmount}>
                    Use
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2>Transfer money</h2>
              <div className={styles.transferGrid}>
                <label>
                  <span>From</span>
                  <div className={styles.selectWrapper}>
                    <select
                      value={sourceId}
                      onChange={(event) => setSourceId(event.target.value)}
                    >
                      {accountOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <div className={styles.swapCell}>
                  <button
                    type="button"
                    className={styles.swapButton}
                    onClick={handleSwapAccounts}
                  >
                    Swap
                  </button>
                </div>
                <label>
                  <span>To</span>
                  <div className={styles.selectWrapper}>
                    <select
                      value={targetId}
                      onChange={(event) => setTargetId(event.target.value)}
                    >
                      {accountOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>
              <button
                className={styles.primary}
                type="button"
                onClick={handleTransaction}
              >
                Apply Transfer
              </button>
              {feedback && <p className={styles.feedback}>{feedback}</p>}
            </div>
          </section>

          <section className={styles.balances}>
            <div className={styles.card}>
              <h2>Live totals</h2>
              <div className={styles.balanceGrid}>
                {activePlayers.map((player) => (
                  <article
                    key={player.id}
                    className={styles.playerCard}
                    style={{
                      borderColor: player.color,
                      boxShadow: `0 18px 45px ${player.color}33`,
                    }}
                  >
                    <header className={styles.playerCardHeader}>
                      <span
                        className={styles.swatch}
                        style={{ backgroundColor: player.color }}
                        aria-hidden="true"
                      />
                      <div>
                        <p
                          className={styles.playerTag}
                          style={{ color: player.color }}
                        >
                          Player {player.id}
                        </p>
                        <h3>{player.name}</h3>
                      </div>
                    </header>
                    <p className={styles.balanceValue}>
                      {formatCurrency(player.balance)}
                    </p>
                  </article>
                ))}
                <article className={styles.playerCard}>
                  <header>
                    <p className={styles.playerTag}>Special</p>
                    <h3>Tax Pile</h3>
                  </header>
                  <p className={styles.balanceValue}>
                    {formatCurrency(taxBalance)}
                  </p>
                </article>
                <article className={styles.playerCard}>
                  <header>
                    <p className={styles.playerTag}>Special</p>
                    <h3>Bank</h3>
                  </header>
                  <p className={styles.balanceValue}>Unlimited</p>
                </article>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
