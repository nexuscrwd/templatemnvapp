/**
 * Curadoria de Imagens da Galeria Temática Vagou para Serviços
 * Fornece fotos e ilustrações profissionais categorizadas para vitrines de serviços
 * quando o salão/profissional não possuir imagem própria.
 */

export interface GalleryPresetItem {
  id: string;
  title: string;
  category: string;
  url: string;
  badge?: string;
}

// Preset URLs de alta qualidade e alta performance (CDN Unsplash otimizado com auto=format&fit=crop)
export const SERVICE_GALLERY_PRESETS: GalleryPresetItem[] = [
  // --- UNHAS / NAIL DESIGN ---
  {
    id: 'preset-unhas-1',
    title: 'Unhas em Gel & Alongamento',
    category: 'Unhas',
    badge: 'Popular',
    url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-unhas-2',
    title: 'Esmaltação & Cuticulagem Fina',
    category: 'Unhas',
    url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-unhas-3',
    title: 'Nail Art & Francesinha Luxo',
    category: 'Unhas',
    badge: 'Destaque',
    url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-unhas-4',
    title: 'Spa dos Pés & Pedicure Completa',
    category: 'Unhas',
    url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  },

  // --- CABELO FEMININO & TRATAMENTOS ---
  {
    id: 'preset-cabelo-1',
    title: 'Corte Moderno & Camadas',
    category: 'Cabelo',
    badge: 'Mais Pedido',
    url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-cabelo-2',
    title: 'Escova Modelada & Brilho',
    category: 'Cabelo',
    url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-cabelo-3',
    title: 'Mechas, Luzes & Morena Iluminada',
    category: 'Cabelo',
    badge: 'Transformação',
    url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-cabelo-4',
    title: 'Nutrição & Cronograma Capilar',
    category: 'Cabelo',
    url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
  },

  // --- BARBEARIA & CORTE MASCULINO ---
  {
    id: 'preset-barbearia-1',
    title: 'Degradê Fade Navalhado',
    category: 'Barbearia',
    badge: 'Tendência',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-barbearia-2',
    title: 'Corte Social na Tesoura',
    category: 'Barbearia',
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-barbearia-3',
    title: 'Platinado Nevou & Freestyle',
    category: 'Barbearia',
    badge: 'Estilo',
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
  },

  // --- BARBA & BARBOTERAPIA ---
  {
    id: 'preset-barba-1',
    title: 'Barboterapia com Toalha Quente',
    category: 'Barba',
    badge: 'Relax',
    url: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-barba-2',
    title: 'Alinhamento & Desenho de Barba',
    category: 'Barba',
    url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
  },

  // --- CÍLIOS & SOBRANCELHAS ---
  {
    id: 'preset-sobrancelhas-1',
    title: 'Design de Sobrancelhas com Henna',
    category: 'Sobrancelhas',
    badge: 'Realce',
    url: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-sobrancelhas-2',
    title: 'Extensão de Cílios Fio a Fio',
    category: 'Sobrancelhas',
    badge: 'Olhar Marcante',
    url: 'https://images.unsplash.com/photo-1512290900672-1f4967341951?auto=format&fit=crop&w=800&q=80',
  },

  // --- ESTÉTICA, ROSTO & CORPO ---
  {
    id: 'preset-estetica-1',
    title: 'Limpeza de Pele & Hidratação',
    category: 'Estética',
    badge: 'Skincare',
    url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-estetica-2',
    title: 'Massagem Relaxante & Drenagem',
    category: 'Estética',
    badge: 'Spa & Bem-estar',
    url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
  },

  // --- COMBOS & PACOTES ---
  {
    id: 'preset-combos-1',
    title: 'Combo Cabelo & Barba Completo',
    category: 'Combos',
    badge: 'Economia',
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'preset-combos-2',
    title: 'Combo Dia de Princesa / Noiva',
    category: 'Combos',
    badge: 'VIP',
    url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
  },
];

/**
 * Retorna as fotos da galeria filtradas por categoria do serviço
 */
export function getGalleryPresetsForCategory(category?: string): GalleryPresetItem[] {
  if (!category || category === 'Todos' || category === 'Todas') {
    return SERVICE_GALLERY_PRESETS;
  }
  const normalized = category.toLowerCase().trim();

  // Mapeamentos flexíveis
  let targetTag = 'cabelo';
  if (normalized.includes('unha') || normalized.includes('manicure') || normalized.includes('pedicure')) {
    targetTag = 'unhas';
  } else if (normalized.includes('barba')) {
    targetTag = 'barba';
  } else if (normalized.includes('barbe')) {
    targetTag = 'barbearia';
  } else if (normalized.includes('sobrancelha') || normalized.includes('cílio') || normalized.includes('cilio') || normalized.includes('lash')) {
    targetTag = 'sobrancelhas';
  } else if (normalized.includes('estética') || normalized.includes('estetica') || normalized.includes('pele') || normalized.includes('corpo') || normalized.includes('massagem') || normalized.includes('spa')) {
    targetTag = 'estética';
  } else if (normalized.includes('combo') || normalized.includes('pacote')) {
    targetTag = 'combos';
  }

  const directMatches = SERVICE_GALLERY_PRESETS.filter((item) =>
    item.category.toLowerCase().includes(targetTag)
  );

  return directMatches.length > 0 ? directMatches : SERVICE_GALLERY_PRESETS.slice(0, 8);
}

/**
 * Retorna a capa padrão de alta qualidade para um serviço sem foto com base na categoria e título
 */
export function getDefaultThematicCoverForCategory(category?: string, title?: string): string {
  const presets = getGalleryPresetsForCategory(category);
  if (title) {
    const t = title.toLowerCase();
    const match = presets.find((p) => p.title.toLowerCase().includes(t) || t.includes(p.title.toLowerCase()));
    if (match) return match.url;
  }
  return presets[0]?.url || SERVICE_GALLERY_PRESETS[0].url;
}
