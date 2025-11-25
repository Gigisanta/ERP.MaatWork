import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('renders when open', () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <div>content</div>
      </Drawer>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) on backdrop click', () => {
    const onChange = vi.fn();
    render(
      <Drawer open onOpenChange={onChange}>
        <div>content</div>
      </Drawer>
    );
    fireEvent.click(screen.getByRole('dialog').previousSibling as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});


