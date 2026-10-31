export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OperatingModel = 'solo' | 'team' | 'home_delivery' | 'hybrid';
export type AppointmentStatus = 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'NO_SHOW';
export type OfferStatus = 'AVAILABLE' | 'RESERVED' | 'BOOKED' | 'EXPIRED' | 'CANCELLED';
export type ServiceType = 'IN_SALON' | 'HOME_DELIVERY';

export interface Database {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string;
          owner_id: string | null;
          trade_name: string;
          legal_name: string;
          slug: string;
          document_type: string;
          document_number: string | null;
          owner_cpf?: string | null;
          pix_key?: string | null;
          pix_keys?: Json | null;
          phone_whatsapp: string | null;
          phone_landline?: string | null;
          email: string | null;
          subdomain?: string | null;
          operating_model: OperatingModel;
          home_delivery_enabled: boolean;
          home_delivery_area: string | null;
          home_delivery_travel_fee: number;
          is_verified: boolean;
          is_active: boolean;
          commission_rate: number;
          address: string | null;
          street_number: string | null;
          complement: string | null;
          neighborhood: string | null;
          city: string | null;
          state: string | null;
          cep: string | null;
          latitude: number;
          longitude: number;
          logo_url: string | null;
          logo_light_url: string | null;
          logo_dark_url: string | null;
          favicon_url?: string | null;
          slogan?: string | null;
          brand_font?: string | null;
          cover_url: string | null;
          branding: Json;
          primary_color: string;
          secondary_color: string;
          bio: string | null;
          rating_avg: number;
          rating_count: number;
          media_slots_count: number;
          billing_plan: string;
          billing_fee_type: string;
          billing_fee_value: number;
          pin_code?: string | null;
          status?: 'active' | 'pending' | 'incomplete' | 'suspended';
          moderation_notes?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          trade_name: string;
          legal_name?: string;
          slug: string;
          document_type?: string;
          document_number?: string | null;
          owner_cpf?: string | null;
          pix_key?: string | null;
          pix_keys?: Json | null;
          phone_whatsapp?: string | null;
          phone_landline?: string | null;
          email?: string | null;
          subdomain?: string | null;
          operating_model?: OperatingModel;
          home_delivery_enabled?: boolean;
          home_delivery_area?: string | null;
          home_delivery_travel_fee?: number;
          is_verified?: boolean;
          is_active?: boolean;
          commission_rate?: number;
          address?: string | null;
          street_number?: string | null;
          complement?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          cep?: string | null;
          latitude?: number;
          longitude?: number;
          logo_url?: string | null;
          logo_light_url?: string | null;
          logo_dark_url?: string | null;
          favicon_url?: string | null;
          slogan?: string | null;
          brand_font?: string | null;
          cover_url?: string | null;
          branding?: Json;
          primary_color?: string;
          secondary_color?: string;
          bio?: string | null;
          rating_avg?: number;
          rating_count?: number;
          media_slots_count?: number;
          billing_plan?: string;
          billing_fee_type?: string;
          billing_fee_value?: number;
          pin_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['salons']['Insert']>;
      };
      salon_members: {
        Row: {
          id: string;
          salon_id: string;
          user_id: string;
          role: 'owner' | 'manager' | 'professional';
          created_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          user_id: string;
          role: 'owner' | 'manager' | 'professional';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['salon_members']['Insert']>;
      };
      platform_admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['platform_admins']['Insert']>;
      };
      professionals: {
        Row: {
          id: string;
          salon_id: string;
          user_id: string | null;
          name: string;
          role: string;
          avatar_url: string | null;
          phone: string | null;
          email: string | null;
          specialties: string[];
          color_hex: string;
          slot_minutes: number;
          use_custom_schedule: boolean;
          schedule_config: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          user_id?: string | null;
          name: string;
          role?: string;
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          specialties?: string[];
          color_hex?: string;
          slot_minutes?: number;
          use_custom_schedule?: boolean;
          schedule_config?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['professionals']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          salon_id: string;
          title: string;
          category: string;
          price: number;
          duration_minutes: number;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          title: string;
          category?: string;
          price: number;
          duration_minutes?: number;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      service_offers: {
        Row: {
          id: string;
          salon_id: string;
          professional_id: string | null;
          service_id: string | null;
          service_title: string;
          category: string;
          price: number;
          original_price: number | null;
          date_str: string;
          start_time: string;
          end_time: string;
          status: OfferStatus;
          media_level: number;
          video_url: string | null;
          gallery_images: string[];
          is_flash_deal: boolean;
          is_recurring: boolean;
          recurring_count: number;
          description: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          professional_id?: string | null;
          service_id?: string | null;
          service_title: string;
          category?: string;
          price: number;
          original_price?: number | null;
          date_str: string;
          start_time: string;
          end_time: string;
          status?: OfferStatus;
          media_level?: number;
          video_url?: string | null;
          gallery_images?: string[];
          is_flash_deal?: boolean;
          is_recurring?: boolean;
          recurring_count?: number;
          description?: string | null;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['service_offers']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          user_id: string | null;
          username?: string | null;
          password_hash?: string | null;
          name: string;
          cpf?: string | null;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          default_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          username?: string | null;
          password_hash?: string | null;
          name: string;
          cpf?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          default_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      client_family_members: {
        Row: {
          id: string;
          guardian_client_id: string;
          name: string;
          relationship: string;
          birth_date: string | null;
          avatar_url: string | null;
          avatar_emoji: string | null;
          gender: string | null;
          notes: string | null;
          autonomy_level: string; // 'parent_controlled' | 'teen_assisted' | 'emancipated'
          phone: string | null;
          email: string | null;
          emancipated_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guardian_client_id: string;
          name: string;
          relationship?: string;
          birth_date?: string | null;
          avatar_url?: string | null;
          avatar_emoji?: string | null;
          gender?: string | null;
          notes?: string | null;
          autonomy_level?: string;
          phone?: string | null;
          email?: string | null;
          emancipated_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['client_family_members']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          protocol_code: string;
          salon_id: string;
          professional_id: string | null;
          offer_id: string | null;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          client_email: string | null;
          is_dependent: boolean;
          dependent_id: string | null;
          dependent_name: string | null;
          service_title: string;
          service_category: string;
          service_type: ServiceType;
          client_address: string | null;
          travel_fee: number;
          price: number;
          date_str: string;
          start_time: string;
          end_time: string;
          status: AppointmentStatus;
          commission_fee: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          protocol_code: string;
          salon_id: string;
          professional_id?: string | null;
          offer_id?: string | null;
          client_id?: string | null;
          client_name: string;
          client_phone: string;
          client_email?: string | null;
          is_dependent?: boolean;
          dependent_id?: string | null;
          dependent_name?: string | null;
          service_title: string;
          service_category?: string;
          service_type?: ServiceType;
          client_address?: string | null;
          travel_fee?: number;
          price: number;
          date_str: string;
          start_time: string;
          end_time: string;
          status?: AppointmentStatus;
          commission_fee?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      salon_media_slots: {
        Row: {
          id: string;
          salon_id: string;
          slot_index: number;
          media_type: 'image' | 'video';
          media_url: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          slot_index: number;
          media_type?: 'image' | 'video';
          media_url: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['salon_media_slots']['Insert']>;
      };
      billing_invoices: {
        Row: {
          id: string;
          salon_id: string;
          reference_month: string;
          total_appointments: number;
          total_amount: number;
          status: string;
          pix_code: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          reference_month: string;
          total_appointments?: number;
          total_amount?: number;
          status?: string;
          pix_code?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['billing_invoices']['Insert']>;
      };
    };
    Functions: {
      get_offers_in_radius: {
        Args: {
          user_lat: number;
          user_lng: number;
          radius_km?: number;
          filter_category?: string | null;
        };
        Returns: {
          offer_id: string;
          salon_id: string;
          salon_name: string;
          salon_neighborhood: string | null;
          salon_address: string | null;
          salon_logo: string | null;
          salon_logo_light: string | null;
          salon_logo_dark: string | null;
          operating_model: OperatingModel;
          home_delivery_enabled: boolean;
          home_delivery_area: string | null;
          home_delivery_travel_fee: number;
          professional_name: string;
          professional_avatar: string | null;
          rating_avg: number;
          rating_count: number;
          service_title: string;
          category: string;
          price: number;
          original_price: number | null;
          date_str: string;
          start_time: string;
          end_time: string;
          media_level: number;
          video_url: string | null;
          gallery_images: string[];
          distance_meters: number;
          distance_km: number;
          expires_at: string;
        }[];
      };
    };
  };
}
