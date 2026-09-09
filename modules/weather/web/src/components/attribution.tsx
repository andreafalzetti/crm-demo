/**
 * MET Norway data is CC BY 4.0: the credit and the link to the licence are a
 * condition of use, not decoration.
 */
export function WeatherAttribution({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] text-muted-foreground ${className}`}>
      Dati meteo{" "}
      <a
        className="underline underline-offset-2"
        href="https://www.met.no/"
        target="_blank"
        rel="noreferrer"
      >
        MET Norway
      </a>{" "}
      ·{" "}
      <a
        className="underline underline-offset-2"
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noreferrer"
      >
        CC BY 4.0
      </a>
    </p>
  )
}
