import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_KEY } from '../context/SettingsContext'
import { playSpeech } from '../lib/audioPlayer'
import { ApiError } from '../services/api'
import { renderWithProviders } from '../test/utils'
import { AudioButton } from './AudioButton'

vi.mock('../lib/audioPlayer', () => ({ playSpeech: vi.fn(), stopSpeech: vi.fn(), clearSpeechCache: vi.fn() }))

beforeEach(() => {
  vi.mocked(playSpeech).mockReset()
  vi.mocked(playSpeech).mockResolvedValue(document.createElement('audio'))
})

describe('AudioButton', () => {
  it('requests the audio with the default voice and speed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AudioButton text="你好" />)
    await user.click(screen.getByRole('button', { name: 'Ouvir pronúncia' }))

    expect(playSpeech).toHaveBeenCalledWith('你好', 'female', '+0%')
  })

  it('uses the voice and speed chosen in the settings', async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ voice: 'male', rate: '-30%' }))
    const user = userEvent.setup()
    renderWithProviders(<AudioButton text="你好" />)
    await user.click(screen.getByRole('button'))

    expect(playSpeech).toHaveBeenCalledWith('你好', 'male', '-30%')
  })

  it('is disabled while the audio is loading', async () => {
    let finish: (audio: HTMLAudioElement) => void = () => {}
    vi.mocked(playSpeech).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    renderWithProviders(<AudioButton text="你好" />)
    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toBeDisabled()
    finish(document.createElement('audio'))
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
  })

  it('shows the API message when the neural voice is unavailable', async () => {
    vi.mocked(playSpeech).mockRejectedValue(new ApiError('O serviço de voz está indisponível no momento.', 'server', 502))
    const user = userEvent.setup()
    renderWithProviders(<AudioButton text="你好" />)
    await user.click(screen.getByRole('button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('O serviço de voz está indisponível no momento.')
    expect(screen.getByRole('button')).toBeEnabled() // can try again
  })

  it('explains autoplay blocking instead of a generic error', async () => {
    vi.mocked(playSpeech).mockRejectedValue(new DOMException('blocked', 'NotAllowedError'))
    const user = userEvent.setup()
    renderWithProviders(<AudioButton text="你好" />)
    await user.click(screen.getByRole('button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('bloqueou a reprodução automática')
  })
})
