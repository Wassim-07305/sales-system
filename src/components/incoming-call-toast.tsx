"use client";

import { useRouter } from "next/navigation";
import { useCallStore } from "@/stores/call-store";
import { useCallNotifications } from "@/lib/hooks/use-call-notifications";
import { Phone, X } from "lucide-react";

export function IncomingCallToast() {
  const router = useRouter();
  const { dismissIncoming } = useCallNotifications();
  const incomingCallId = useCallStore((s) => s.incomingCallId);
  const incomingCallerName = useCallStore((s) => s.incomingCallerName);

  if (!incomingCallId) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl w-80">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#7af17a]/20 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Phone className="w-5 h-5 text-[#7af17a]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Appel entrant</p>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">
              {incomingCallerName ?? "Quelqu'un"} vous appelle
            </p>
          </div>
          <button
            onClick={dismissIncoming}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              dismissIncoming();
              router.push(`/live/${incomingCallId}`);
            }}
            className="flex-1 h-9 rounded-xl bg-[#7af17a] text-zinc-900 text-sm font-semibold hover:bg-[#6ae06a] transition-colors"
          >
            Rejoindre
          </button>
          <button
            onClick={dismissIncoming}
            className="flex-1 h-9 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Ignorer
          </button>
        </div>
      </div>
    </div>
  );
}
