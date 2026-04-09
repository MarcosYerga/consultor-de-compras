import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import type { CompareResponse } from '@consultor/api-types';

const postCompareMock = jest.fn();

jest.unstable_mockModule('./api/compare.js', () => ({
  postCompare: postCompareMock,
}));

const { App } = await import('./App.js');

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

const compareResponse: CompareResponse = {
  compared_at: new Date().toISOString(),
  demo: true,
  mode: 'per_item',
  items: [],
};

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    postCompareMock.mockResolvedValue(compareResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renderiza la pantalla principal y permite comparar', async () => {
    renderApp();

    expect(screen.getByRole('heading', { name: /consultor de compras/i })).toBeTruthy();

    const compareButton = screen.getByRole('button', { name: /comparar/i });
    expect(compareButton).toBeTruthy();
    expect(compareButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(compareButton);

    await waitFor(() => {
      expect(postCompareMock).toHaveBeenCalledTimes(1);
    });
  });

  it('envía líneas limpias, modo y flag demo al comparar', async () => {
    renderApp();

    const textarea = screen.getByLabelText(/lista de compra/i);
    fireEvent.change(textarea, {
      target: {
        value: '  leche entera 1 l  \n\n aceite de oliva 1 l\n',
      },
    });

    fireEvent.click(screen.getByLabelText(/cesta/i));

    const demoCheckbox = screen.getByRole('checkbox', { name: /modo demo/i });
    fireEvent.click(demoCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /comparar/i }));

    await waitFor(() => {
      expect(postCompareMock).toHaveBeenCalledWith(
        ['leche entera 1 l', 'aceite de oliva 1 l'],
        false,
        'basket',
      );
    });
  });
});
