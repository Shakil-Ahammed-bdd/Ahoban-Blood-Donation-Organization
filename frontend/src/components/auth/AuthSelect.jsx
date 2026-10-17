function AuthSelect({ children, error, label, name, ...selectProps }) {
  const errorId = `${name}-error`
  return (
    <label className="auth-field" htmlFor={name}>
      <span>{label}</span>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        {...selectProps}
      >
        {children}
      </select>
      {error && <small className="field-error" id={errorId}>{error}</small>}
    </label>
  )
}

export default AuthSelect
