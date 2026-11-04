import { useCallback, useEffect, useRef, useState } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { errorMessage, getTicket, ticketKey } from "./data";
import type { JoinResponse, RoomState, Ticket } from "./types";

export function useRoom(
  pin: string,
  role: "host" | "player",
  initial: Ticket | null,
) {
  const [state, setState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");
  const connection = useRef<HubConnection | null>(null);
  const currentQuestion = useRef(0);
  const offset = useRef(0);

  useEffect(() => {
    if (!initial) {
      setStatus("missing");
      return;
    }
    let disposed = false;
    let latestRevision = -1;
    let ticket = getTicket(pin, role) ?? initial;
    const hub = new HubConnectionBuilder()
      .withUrl("/hubs/quiz")
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();
    connection.current = hub;

    function apply(next: RoomState) {
      if (disposed || next.revision < latestRevision) return false;
      latestRevision = next.revision;
      offset.current = Date.parse(next.serverTime) - Date.now();
      if (currentQuestion.current !== next.questionNumber) {
        setAnswer(null);
        currentQuestion.current = next.questionNumber;
      }
      // Η απάντηση του Join και ένα live event μπορεί να φτάσουν με διαφορετική σειρά.
      setState(next);
      return true;
    }
    async function join() {
      const result = await hub.invoke<JoinResponse>(
        role === "host" ? "JoinHost" : "JoinPlayer",
        ...(role === "host"
          ? [pin, ticket.token]
          : [pin, ticket.name ?? "", ticket.token || null]),
      );
      if (disposed) return;
      if (result.playerToken) {
        ticket = { ...ticket, token: result.playerToken };
        sessionStorage.setItem(ticketKey(pin, role), JSON.stringify(ticket));
      }
      const applied = apply(result.state);
      setPlayerId(result.playerId);
      if (applied) setAnswer(result.answer);
      setStatus("connected");
      setError("");
    }
    hub.on("RoomUpdated", apply);
    hub.on("RoomExpired", () => {
      setError("Το δωμάτιο έληξε. Επέστρεψε στην αρχική για νέο παιχνίδι.");
      setStatus("expired");
    });
    hub.onreconnecting(() => {
      if (!disposed) setStatus("reconnecting");
    });
    hub.onreconnected(async () => {
      try {
        await join();
      } catch (e) {
        if (!disposed) {
          setError(errorMessage(e));
          setStatus("failed");
        }
      }
    });
    hub.onclose(() => {
      if (!disposed) setStatus("disconnected");
    });
    void (async () => {
      try {
        await hub.start();
        if (!disposed) await join();
      } catch (e) {
        if (!disposed) {
          setError(errorMessage(e));
          setStatus("failed");
        }
      }
    })();
    return () => {
      disposed = true;
      connection.current = null;
      void hub.stop();
    };
    // Το ticket ανακτάται μετά την επανασύνδεση. Δεν ξανανοίγουμε hub σε κάθε render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, role, initial]);

  const invoke = useCallback(async (method: string, ...args: unknown[]) => {
    if (connection.current?.state !== HubConnectionState.Connected)
      throw new Error("Περίμενε να αποκατασταθεί η σύνδεση.");
    setError("");
    await connection.current.invoke(method, ...args);
  }, []);
  return {
    state,
    playerId,
    answer,
    recordAnswer: (questionNumber: number, option: number) => {
      // Μια καθυστερημένη επιβεβαίωση δεν πρέπει να επιλέξει απάντηση στον επόμενο γύρο.
      if (currentQuestion.current === questionNumber) setAnswer(option);
    },
    status,
    error,
    setError,
    invoke,
    offset,
  };
}
