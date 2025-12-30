import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import FileUploader from './FileUploader';

vi.mock('@/lib/api', () => ({
  uploadAumFile: vi.fn().mockResolvedValue({
    success: true,
    data: {
      ok: true,
      fileId: 'test-file-id-123',
      filename: 'test.csv',
      totals: {
        parsed: 10,
        matched: 8,
        ambiguous: 1,
        conflicts: 0,
        unmatched: 1,
      },
    },
  }),
}));

describe('FileUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Selection', () => {
    it('opens file dialog when button is clicked', () => {
      render(<FileUploader />);

      const selectButton = screen.getByText('📤 Seleccionar archivo');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');

      fireEvent.click(selectButton);
      // File input click is simulated by test
    });

    it('shows file info after selection', () => {
      render(<FileUploader />);

      const file = new File(['content'], 'test-data.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('test-data.csv')).toBeInTheDocument();
      // File size is 7 bytes, formatted as "7 B" (no decimals for bytes < 1024)
      expect(screen.getByText('7 B')).toBeInTheDocument();
      expect(screen.getByText('📄 Cambiar archivo')).toBeInTheDocument();
    });

    it('allows clearing selected file', () => {
      render(<FileUploader />);

      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      const clearButton = screen.getByLabelText('Eliminar archivo');
      fireEvent.click(clearButton);

      expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
      expect(screen.getByText('📤 Seleccionar archivo')).toBeInTheDocument();
    });
  });

  describe('File Validation', () => {
    it('rejects invalid file types', () => {
      render(<FileUploader />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText(/Tipo de archivo no permitido/)).toBeInTheDocument();
      expect(fileInput.value).toBe('');
    });

    it.skip('rejects files that are too large', () => {
      render(<FileUploader />);

      // Create a file larger than 25MB
      const largeContent = new Blob(['x'.repeat(26 * 1024 * 1024)]);
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText(/Archivo demasiado grande/)).toBeInTheDocument();
      expect(fileInput.value).toBe('');
    });

    it('rejects empty files', () => {
      render(<FileUploader />);

      const file = new File([], 'empty.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('El archivo está vacío')).toBeInTheDocument();
      expect(fileInput.value).toBe('');
    });

    it('accepts valid CSV files', () => {
      render(<FileUploader />);

      const file = new File(['content'], 'valid.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.queryByText(/no permitido|demasiado grande|vacío/)).not.toBeInTheDocument();
      expect(screen.getByText('valid.csv')).toBeInTheDocument();
    });
  });

  describe('Upload Flow', () => {
    it('uploads file and calls onUploadSuccess', async () => {
      const { uploadAumFile } = await import('@/lib/api');
      const onUploadSuccess = vi.fn();
      render(<FileUploader onUploadSuccess={onUploadSuccess} />);

      const file = new File(['content'], 'aum.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /^Subir$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => expect(uploadAumFile).toHaveBeenCalledWith(file, 'balanz'));
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    it('shows loading state during upload', async () => {
      const { uploadAumFile } = await import('@/lib/api');
      render(<FileUploader />);

      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /^Subir$/ });
      fireEvent.click(uploadButton);

      expect(screen.getByText('Subiendo...')).toBeInTheDocument();

      await waitFor(() => expect(uploadAumFile).toHaveBeenCalled());
    });

    it('disables controls during upload', async () => {
      const { uploadAumFile } = await import('@/lib/api');
      render(<FileUploader />);

      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /^Subir$/ });
      fireEvent.click(uploadButton);

      expect(uploadButton).toBeDisabled();
      expect(fileInput).toBeDisabled();

      await waitFor(() => expect(uploadAumFile).toHaveBeenCalled());
    });

    it('shows success message after upload', async () => {
      const { uploadAumFile } = await import('@/lib/api');
      render(<FileUploader />);

      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /^Subir$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => expect(screen.getByText('✓ Subido')).toBeInTheDocument());
    });

    it('handles upload errors gracefully', async () => {
      const { uploadAumFile } = await import('@/lib/api');
      const mockError = { userMessage: 'Upload failed', message: 'Server error' };
      vi.mocked(uploadAumFile).mockRejectedValue(mockError);

      render(<FileUploader />);

      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole('button', { name: /^Subir$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => expect(screen.getByText('Upload failed')).toBeInTheDocument());
    });
  });

  describe('File Size Formatting', () => {
    it('formats bytes correctly', () => {
      render(<FileUploader />);

      const file = new File(['x'], 'tiny.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('1 B')).toBeInTheDocument();
    });

    it('formats KB correctly', () => {
      render(<FileUploader />);

      const content = 'x'.repeat(2048); // 2KB
      const file = new File([content], 'medium.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('formats MB correctly', () => {
      render(<FileUploader />);

      const content = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const file = new File([content], 'large.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    });
  });
});
