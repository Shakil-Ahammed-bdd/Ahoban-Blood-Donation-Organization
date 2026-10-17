function AuthField({ error, label, name, ...inputProps }) {
  const errorId = `${name}-error`
  return (
    <label className="auth-field" htmlFor={name}>
      <span>{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        {...inputProps}
      />
      {error && <small className="field-error" id={errorId}>{error}</small>}
    </label>
  )
}

export default AuthField
