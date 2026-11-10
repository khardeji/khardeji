export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      boost_services: {
        Row: {
          cost: number
          created_at: string
          description: Json
          icon: string
          id: string
          is_active: boolean
          name: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          cost: number
          created_at?: string
          description?: Json
          icon?: string
          id: string
          is_active?: boolean
          name: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          description?: Json
          icon?: string
          id?: string
          is_active?: boolean
          name?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          image: string
          is_active: boolean
          name: Json
          slug: string
          sort_order: number
          subcategories: string[]
          tagline: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          image?: string
          is_active?: boolean
          name: Json
          slug: string
          sort_order?: number
          subcategories?: string[]
          tagline?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          image?: string
          is_active?: boolean
          name?: Json
          slug?: string
          sort_order?: number
          subcategories?: string[]
          tagline?: Json
          updated_at?: string
        }
        Relationships: []
      }
      listing_private: {
        Row: {
          created_at: string
          listing_id: string
          owner_id: string
          reserve_price: number | null
        }
        Insert: {
          created_at?: string
          listing_id: string
          owner_id: string
          reserve_price?: number | null
        }
        Update: {
          created_at?: string
          listing_id?: string
          owner_id?: string
          reserve_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_private_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          auction: Json | null
          category: string
          city: Json
          created_at: string
          description: Json
          featured: boolean
          governorate: string
          id: string
          images: string[]
          moderation_note: string
          owner_id: string | null
          price: number
          published_at: string
          sale_type: string
          seller: Json
          status: string
          stock: number
          subcategory: string
          title: Json
          unit: string
          updated_at: string
          urgent: boolean
        }
        Insert: {
          auction?: Json | null
          category: string
          city?: Json
          created_at?: string
          description?: Json
          featured?: boolean
          governorate: string
          id?: string
          images?: string[]
          moderation_note?: string
          owner_id?: string | null
          price?: number
          published_at?: string
          sale_type: string
          seller: Json
          status?: string
          stock?: number
          subcategory?: string
          title: Json
          unit: string
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          auction?: Json | null
          category?: string
          city?: Json
          created_at?: string
          description?: Json
          featured?: boolean
          governorate?: string
          id?: string
          images?: string[]
          moderation_note?: string
          owner_id?: string | null
          price?: number
          published_at?: string
          sale_type?: string
          seller?: Json
          status?: string
          stock?: number
          subcategory?: string
          title?: Json
          unit?: string
          updated_at?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          features: Json
          highlight: boolean
          id: string
          is_active: boolean
          name: Json
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          highlight?: boolean
          id: string
          is_active?: boolean
          name: Json
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          highlight?: boolean
          id?: string
          is_active?: boolean
          name?: Json
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          phone: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_blocked?: boolean
          phone?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      token_packs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          price: number
          sort_order: number
          tag: Json | null
          tokens: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          price: number
          sort_order?: number
          tag?: Json | null
          tokens: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          sort_order?: number
          tag?: Json | null
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _user_id: string }; Returns: boolean }
      site_stats: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
