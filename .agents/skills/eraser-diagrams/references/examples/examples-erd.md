# ERD Example

## User Management Schema
Database schema for an authentication and profile system.

```eraser
// Styles
notation crows-feet
colorMode outline

// Entities
Users [icon: user] {
  id uuid pk
  email varchar
  password_hash varchar
}

Profiles {
  id uuid pk
  user_id uuid fk
  full_name varchar
  avatar_url varchar
}

Roles {
  id int pk
  name varchar
}

// Relationships
Users.id - Profiles.user_id // One-to-one
Users > Roles // Many-to-one
```
