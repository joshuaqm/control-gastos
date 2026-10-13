let amountsHidden = false

export const setAmountsHidden = (hidden: boolean) => {
  amountsHidden = hidden
}

export const areAmountsHidden = () => amountsHidden

export const HIDDEN_AMOUNT = '••••••'

export const fmt = (n: number) =>
  amountsHidden
    ? HIDDEN_AMOUNT
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))

export const fmtSigned = (n: number) =>
  amountsHidden
    ? HIDDEN_AMOUNT
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
