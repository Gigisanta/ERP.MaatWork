"use client";
import { usePageTitle } from '../../components/PageTitleContext';

interface PageTitleSetterProps {
  contactName: string;
}

export default function PageTitleSetter({ contactName }: PageTitleSetterProps) {
  usePageTitle(contactName);
  return null;
}

