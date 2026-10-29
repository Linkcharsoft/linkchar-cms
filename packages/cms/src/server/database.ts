export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          created_at: string;
          details: NonNullable<Json>;
          document_id: string | null;
          id: number;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          created_at?: string;
          details?: NonNullable<Json>;
          document_id?: string | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: NonNullable<Json>;
          document_id?: string | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_log_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'document_status';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_log_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      document_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          data: NonNullable<Json>;
          document_id: string;
          id: string;
          reason: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          data: NonNullable<Json>;
          document_id: string;
          id?: string;
          reason: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          data?: NonNullable<Json>;
          document_id?: string;
          id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'document_versions_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'document_status';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'document_versions_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
      documents: {
        Row: {
          created_at: string;
          created_by: string | null;
          data: NonNullable<Json>;
          deleted_at: string | null;
          id: string;
          key: string | null;
          revision: number;
          slug: string | null;
          slugs: NonNullable<Json>;
          sort_order: number;
          type: string;
          updated_at: string;
          updated_by: string | null;
          visible: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          data?: NonNullable<Json>;
          deleted_at?: string | null;
          id?: string;
          key?: string | null;
          revision?: number;
          slug?: string | null;
          slugs?: NonNullable<Json>;
          sort_order?: number;
          type: string;
          updated_at?: string;
          updated_by?: string | null;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          data?: NonNullable<Json>;
          deleted_at?: string | null;
          id?: string;
          key?: string | null;
          revision?: number;
          slug?: string | null;
          slugs?: NonNullable<Json>;
          sort_order?: number;
          type?: string;
          updated_at?: string;
          updated_by?: string | null;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      media: {
        Row: {
          alt: NonNullable<Json>;
          blur_data_url: string | null;
          caption: NonNullable<Json>;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          duration: number | null;
          filename: string;
          focal_x: number | null;
          focal_y: number | null;
          folder: string;
          hash: string | null;
          height: number | null;
          id: string;
          mime: string;
          path: string;
          poster_id: string | null;
          size: number;
          updated_at: string;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          alt?: NonNullable<Json>;
          blur_data_url?: string | null;
          caption?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration?: number | null;
          filename?: string;
          focal_x?: number | null;
          focal_y?: number | null;
          folder?: string;
          hash?: string | null;
          height?: number | null;
          id?: string;
          mime: string;
          path: string;
          poster_id?: string | null;
          size: number;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          alt?: NonNullable<Json>;
          blur_data_url?: string | null;
          caption?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration?: number | null;
          filename?: string;
          focal_x?: number | null;
          focal_y?: number | null;
          folder?: string;
          hash?: string | null;
          height?: number | null;
          id?: string;
          mime?: string;
          path?: string;
          poster_id?: string | null;
          size?: number;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'media_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_poster_id_fkey';
            columns: ['poster_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          avatar: string | null;
          can_publish: boolean;
          created_at: string;
          id: string;
          name: string;
          role: Database['public']['Enums']['app_role'];
          seen_tours: string[];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          avatar?: string | null;
          can_publish?: boolean;
          created_at?: string;
          id: string;
          name?: string;
          role?: Database['public']['Enums']['app_role'];
          seen_tours?: string[];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          avatar?: string | null;
          can_publish?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          role?: Database['public']['Enums']['app_role'];
          seen_tours?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      publish_log: {
        Row: {
          app_id: string | null;
          branch: string | null;
          build_stamp: string | null;
          build_status: string;
          built_at: string | null;
          commit: string | null;
          documents_count: number;
          error_code: string | null;
          error_detail: string | null;
          finished_at: string | null;
          id: number;
          items: NonNullable<Json>;
          job_id: string | null;
          region: string | null;
          removed_count: number;
          requested_at: string;
          requested_by: string | null;
          retry_of: number | null;
        };
        ComputedFields: never;
        Insert: {
          app_id?: string | null;
          branch?: string | null;
          build_stamp?: string | null;
          build_status?: string;
          built_at?: string | null;
          commit?: string | null;
          documents_count?: number;
          error_code?: string | null;
          error_detail?: string | null;
          finished_at?: string | null;
          id?: never;
          items?: NonNullable<Json>;
          job_id?: string | null;
          region?: string | null;
          removed_count?: number;
          requested_at?: string;
          requested_by?: string | null;
          retry_of?: number | null;
        };
        Update: {
          app_id?: string | null;
          branch?: string | null;
          build_stamp?: string | null;
          build_status?: string;
          built_at?: string | null;
          commit?: string | null;
          documents_count?: number;
          error_code?: string | null;
          error_detail?: string | null;
          finished_at?: string | null;
          id?: never;
          items?: NonNullable<Json>;
          job_id?: string | null;
          region?: string | null;
          removed_count?: number;
          requested_at?: string;
          requested_by?: string | null;
          retry_of?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'publish_log_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'publish_log_retry_of_fkey';
            columns: ['retry_of'];
            isOneToOne: false;
            referencedRelation: 'publish_log';
            referencedColumns: ['id'];
          }
        ];
      };
      published_documents: {
        Row: {
          data: NonNullable<Json>;
          id: string;
          key: string | null;
          paths: NonNullable<Json>;
          published_at: string;
          published_by: string | null;
          slug: string | null;
          slugs: NonNullable<Json>;
          sort_order: number;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          data: NonNullable<Json>;
          id: string;
          key?: string | null;
          paths?: NonNullable<Json>;
          published_at?: string;
          published_by?: string | null;
          slug?: string | null;
          slugs?: NonNullable<Json>;
          sort_order?: number;
          type: string;
        };
        Update: {
          data?: NonNullable<Json>;
          id?: string;
          key?: string | null;
          paths?: NonNullable<Json>;
          published_at?: string;
          published_by?: string | null;
          slug?: string | null;
          slugs?: NonNullable<Json>;
          sort_order?: number;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'published_documents_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'document_status';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'published_documents_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'published_documents_published_by_fkey';
            columns: ['published_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      redirects: {
        Row: {
          created_at: string;
          created_by: string | null;
          from_path: string;
          id: string;
          status: number;
          to_path: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          from_path: string;
          id?: string;
          status?: number;
          to_path: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          from_path?: string;
          id?: string;
          status?: number;
          to_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'redirects_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      document_status: {
        Row: {
          created_at: string | null;
          data: Json | null;
          deleted_at: string | null;
          id: string | null;
          key: string | null;
          pending: boolean | null;
          published_at: string | null;
          published_by: string | null;
          published_paths: Json | null;
          published_slug: string | null;
          published_slugs: Json | null;
          revision: number | null;
          slug: string | null;
          slugs: Json | null;
          sort_order: number | null;
          status: string | null;
          type: string | null;
          updated_at: string | null;
          updated_by: string | null;
          visible: boolean | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: 'documents_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'published_documents_published_by_fkey';
            columns: ['published_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Functions: {
      author_names: {
        Args: { ids: string[] };
        Returns: {
          id: string;
          name: string;
        }[];
      };
      cms_migrations: { Args: Record<PropertyKey, never>; Returns: string[] };
      document_usage: {
        Args: { ids: string[] };
        Returns: {
          data: Json;
          document_id: string;
          keys: string[];
          published: boolean;
          target_id: string;
          trashed: boolean;
          type: string;
        }[];
      };
      media_usage: {
        Args: { ids: string[] };
        Returns: {
          data: Json;
          document_id: string;
          keys: string[];
          media_id: string;
          published: boolean;
          trashed: boolean;
          type: string;
        }[];
      };
      publish_site: { Args: { p_publish: Json; p_remove?: string[] }; Returns: Json };
    };
    Enums: {
      app_role: 'editor' | 'admin' | 'superadmin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
    Row: infer R;
  }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I;
  }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U;
  }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {}
  },
  public: {
    Enums: {
      app_role: ['editor', 'admin', 'superadmin']
    }
  }
} as const
