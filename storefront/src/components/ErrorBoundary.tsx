import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Eclipse ErrorBoundary:', error, info)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-[#06060d] px-6 text-center">
            <div className="max-w-md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Algo salió mal</p>
              <h1 className="mt-2 font-display text-2xl font-semibold text-white">La página se detuvo</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {this.state.message || 'Ocurrió un error inesperado. Recarga la página para continuar.'}
              </p>
              <button
                type="button"
                onClick={() => { this.reset(); window.location.reload() }}
                className="mt-6 rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
              >
                Recargar
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
