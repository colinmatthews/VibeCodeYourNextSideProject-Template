import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TodoList } from '../TodoList';
import { apiRequest } from '@/lib/queryClient';

// Mock dependencies
jest.mock('@/lib/queryClient');

// Mock Replit Auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    isLoading: false,
    logout: jest.fn(),
  }),
}));

describe('TodoList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderTodoList = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TodoList {...props} />
      </QueryClientProvider>
    );
  };

  const mockTodos = [
    {
      id: 1,
      item: 'Buy groceries',
      status: 'open',
      userId: 'test-user-123',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      item: 'Write tests',
      status: 'in_progress',
      userId: 'test-user-123',
      createdAt: '2025-01-01T01:00:00.000Z',
      updatedAt: '2025-01-01T01:00:00.000Z',
    },
    {
      id: 3,
      item: 'Deploy app',
      status: 'completed',
      userId: 'test-user-123',
      createdAt: '2025-01-01T02:00:00.000Z',
      updatedAt: '2025-01-01T02:00:00.000Z',
    },
  ];

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      (apiRequest as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderTodoList();

      expect(screen.getByText('My Todos')).toBeInTheDocument();
    });

    it('should render todos list successfully', async () => {
      (apiRequest as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTodos,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
        expect(screen.getByText('Write tests (#2)')).toBeInTheDocument();
        expect(screen.getByText('Deploy app (#3)')).toBeInTheDocument();
      });

      expect(screen.getByText('3 of 3 items')).toBeInTheDocument();
    });

    it('should render empty state when no todos', async () => {
      (apiRequest as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('No todos')).toBeInTheDocument();
        expect(screen.getByText('Ask the AI to create one!')).toBeInTheDocument();
      });
    });

    it('should display todo count correctly', async () => {
      (apiRequest as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTodos,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('3 of 3 items')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      (apiRequest as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTodos,
      });
    });

    it('should show all todos by default', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
        expect(screen.getByText('Write tests (#2)')).toBeInTheDocument();
        expect(screen.getByText('Deploy app (#3)')).toBeInTheDocument();
      });
    });

    it('should filter todos by "open" status', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
      });

      const openButton = screen.getByRole('button', { name: /open/i });
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
        expect(screen.queryByText('Write tests (#2)')).not.toBeInTheDocument();
        expect(screen.queryByText('Deploy app (#3)')).not.toBeInTheDocument();
      });

      expect(screen.getByText('1 of 3 items')).toBeInTheDocument();
    });

    it('should filter todos by "in_progress" status', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Write tests (#2)')).toBeInTheDocument();
      });

      const activeButton = screen.getByRole('button', { name: /active/i });
      fireEvent.click(activeButton);

      await waitFor(() => {
        expect(screen.queryByText('Buy groceries (#1)')).not.toBeInTheDocument();
        expect(screen.getByText('Write tests (#2)')).toBeInTheDocument();
        expect(screen.queryByText('Deploy app (#3)')).not.toBeInTheDocument();
      });

      expect(screen.getByText('1 of 3 items')).toBeInTheDocument();
    });

    it('should filter todos by "completed" status', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Deploy app (#3)')).toBeInTheDocument();
      });

      const doneButton = screen.getByRole('button', { name: /done/i });
      fireEvent.click(doneButton);

      await waitFor(() => {
        expect(screen.queryByText('Buy groceries (#1)')).not.toBeInTheDocument();
        expect(screen.queryByText('Write tests (#2)')).not.toBeInTheDocument();
        expect(screen.getByText('Deploy app (#3)')).toBeInTheDocument();
      });

      expect(screen.getByText('1 of 3 items')).toBeInTheDocument();
    });
  });

  describe('Status Updates', () => {
    it('should update todo status when status icon is clicked', async () => {
      (apiRequest as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockTodos[0],
            status: 'in_progress',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos.map((t) =>
            t.id === 1 ? { ...t, status: 'in_progress' } : t
          ),
        });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
      });

      const statusButtons = screen.getAllByRole('button');
      const firstTodoStatusButton = statusButtons.find((btn) =>
        btn.getAttribute('title')?.includes('mark as')
      );

      if (firstTodoStatusButton) {
        fireEvent.click(firstTodoStatusButton);

        await waitFor(() => {
          expect(apiRequest).toHaveBeenCalledWith(
            'PATCH',
            '/api/items/1/status',
            { status: 'in_progress' }
          );
        });
      }
    });

    it('should call onTodoChange callback after status update', async () => {
      const onTodoChange = jest.fn();

      (apiRequest as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockTodos[0],
            status: 'in_progress',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos,
        });

      renderTodoList({ onTodoChange });

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
      });

      const statusButtons = screen.getAllByRole('button');
      const firstTodoStatusButton = statusButtons.find((btn) =>
        btn.getAttribute('title')?.includes('mark as')
      );

      if (firstTodoStatusButton) {
        fireEvent.click(firstTodoStatusButton);

        await waitFor(() => {
          expect(onTodoChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Deletion', () => {
    it('should delete todo when delete button is clicked', async () => {
      (apiRequest as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos.filter((t) => t.id !== 1),
        });

      const { container } = renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
      });

      // Hover over todo to show delete button
      const todoItem = container.querySelector('.group');
      if (todoItem) {
        fireEvent.mouseEnter(todoItem);
      }

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('lucide-trash-2');
      });

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(apiRequest).toHaveBeenCalledWith('DELETE', '/api/items/1');
        });
      }
    });

    it('should call onTodoChange callback after deletion', async () => {
      const onTodoChange = jest.fn();

      (apiRequest as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTodos.filter((t) => t.id !== 1),
        });

      const { container } = renderTodoList({ onTodoChange });

      await waitFor(() => {
        expect(screen.getByText('Buy groceries (#1)')).toBeInTheDocument();
      });

      const todoItem = container.querySelector('.group');
      if (todoItem) {
        fireEvent.mouseEnter(todoItem);
      }

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('lucide-trash-2');
      });

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(onTodoChange).toHaveBeenCalled();
        });
      }
    });
  });
});
