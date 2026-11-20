import type { ContextWindowSnapshot } from "@t3tools/client-runtime/state/context-window";
import { useGT, useLocale, useMessages } from "gt-react";

import { formatContextWindowTokens } from "../../lib/contextWindow";
import { cn } from "../../lib/utils";
import { ComposerControl } from "./ComposerControl";
import { formatContextWindowCompactionMessage } from "./compaction.logic";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const RING_SIZE = 20;
const RING_STROKE = 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatCost(cost: NonNullable<ContextWindowSnapshot["cost"]>, locale: string): string {
  const fractionDigits = cost.amount !== 0 && Math.abs(cost.amount) < 1 ? 4 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cost.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: fractionDigits,
    }).format(cost.amount);
  } catch {
    return `${cost.amount.toFixed(fractionDigits)} ${cost.currency}`;
  }
}

/**
 * The active thread's context window in the composer footer: a ring that fills as the model's
 * context is used, with the numbers behind it on hover.
 */
export function ContextWindowMeter({ usage }: { readonly usage: ContextWindowSnapshot }) {
  const gt = useGT();
  const locale = useLocale();
  const m = useMessages();
  const maxTokens = usage.maxTokens != null && usage.maxTokens > 0 ? usage.maxTokens : null;
  const threshold = usage.autoCompactThreshold ?? null;
  const usedPercent =
    usage.usedPercentage === null ? null : Math.max(0, Math.min(100, usage.usedPercentage));
  const roundedPercent = usedPercent === null ? null : Math.round(usedPercent);
  const usedTokens = formatContextWindowTokens(usage.usedTokens);
  const usedLabel =
    roundedPercent !== null
      ? gt("{used}% used", { used: roundedPercent })
      : gt("{usedTokens} tokens used", { usedTokens });
  const tone =
    usedPercent === null
      ? null
      : usedPercent >= 90
        ? "error"
        : usedPercent >= 80
          ? "warning"
          : null;
  const dashOffset =
    usedPercent === null ? RING_CIRCUMFERENCE : RING_CIRCUMFERENCE * (1 - usedPercent / 100);
  const cost = usage.cost == null ? null : formatCost(usage.cost, locale);

  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={
          <ComposerControl
            data-context-window-meter="true"
            className="px-1.5"
            aria-label={gt("Context window: {used}", { used: usedLabel })}
          />
        }
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className={cn(
            "size-4 shrink-0",
            tone === "error"
              ? "text-error"
              : tone === "warning"
                ? "text-warning"
                : "text-muted-foreground",
          )}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            className="stroke-current opacity-25"
          />
          {usedPercent !== null && usedPercent > 0 ? (
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              className="stroke-current"
            />
          ) : null}
        </svg>
      </TooltipTrigger>
      <TooltipPopup side="top">
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground">{gt("Context window")}</span>
          <span className="font-medium text-foreground">{usedLabel}</span>
          {maxTokens !== null ? (
            <span className="text-muted-foreground">
              {gt("{used} / {max} tokens", {
                used: usedTokens,
                max: formatContextWindowTokens(maxTokens),
              })}
            </span>
          ) : null}
          {threshold !== null && threshold > 0 ? (
            <span className="text-muted-foreground">
              {formatContextWindowCompactionMessage(threshold, m)}
            </span>
          ) : null}
          {cost !== null ? (
            <span className="text-muted-foreground">{gt("Session cost {cost}", { cost })}</span>
          ) : null}
        </div>
      </TooltipPopup>
    </Tooltip>
  );
}
