use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct User{
    pub email: String,
    pub password: String
}