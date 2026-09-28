# Kindergarten Management System

A full-stack web application designed to centralize kindergarten operations, communication, scheduling, and information management.

The platform provides dedicated experiences for visitors, parents, workers, and administrators, with role-based permissions controlling the information and functionality available to each user.

> Developed as a university project for the Web Application Development (CS412) course.

## Features

### Visitor Portal
- Browse public kindergarten information
- Explore programs and admissions
- View gallery and location information
- Contact the kindergarten
- Request a visit
- Submit inquiries

### Parent Portal
- View child-related information
- Access schedules and calendar events
- View announcements
- Track payment status
- Communicate through authorized messaging
- View relevant activities and updates

### Worker Portal
- Access assigned groups and children
- Manage attendance
- View schedules and calendar events
- Post operational updates
- Communicate within authorized channels

### Admin Portal
- Manage users and roles
- Manage children and groups
- Create and manage calendar events
- Manage payment records
- Publish announcements
- Handle communication and inquiries
- Oversee platform content and configuration

## Calendar & Scheduling

The application provides a shared calendar with role-based visibility.

Administrators can create, edit, and delete events, while workers and parents receive calendar information relevant to their assigned groups or children.

Public holidays are integrated as read-only calendar entries.

## Communication

The platform provides role-aware messaging designed to keep communication within authorized channels.

Communication permissions are restricted based on user roles and relationships to prevent unauthorized access to conversations.

## Payment Management

Administrators can maintain payment records for children, including:

- Billing period
- Amount
- Due date
- Payment status

Parents receive read-only access to the relevant payment information.

## Role-Based Access Control

The system supports four main roles:

| Role | Access |
|---|---|
| Visitor | Public information and inquiries |
| Parent | Child-specific information and communication |
| Worker | Assigned groups and operational tools |
| Admin | Full system administration |

Authorization is enforced on protected backend operations rather than relying only on frontend visibility.

## Technologies

### Frontend
- React
- JavaScript
- HTML
- CSS

### Backend
- Node.js
- Express.js

### Additional Integrations
- Google Maps
- Public Holiday API
- REST APIs

## Architecture

The application follows a full-stack architecture:

User
↓
React Frontend
↓
REST API
↓
Express Backend
↓
Database

Role-based authorization determines which resources and operations are available to each authenticated user.

## Project Objectives

The main objectives of the project were to:

- Implement a full-stack web application
- Provide role-based access
- Centralize kindergarten information
- Improve communication between parents and staff
- Support scheduling and attendance management
- Protect child and parent information
- Provide a clear and accessible user experience

## What I Learned
 
Through this project, I gained practical experience with:
 
- Full-stack web development
- React application development
- REST API design
- Backend development with Node.js and Express
- Database integration
- Authentication and authorization
- Role-based access control
- Component-based frontend architecture
- API integration
- Managing application state
- Designing interfaces for different user roles
- Team-based software development
 
## Academic Context
 
This project was developed for the **CS412 Web Application Development** course at the **International University of Sarajevo**.
 
The project demonstrates the development of a multi-role web platform from frontend user interfaces to backend APIs, database operations, authentication, and authorization.
 
## Contributors
 
This was a collaborative university project developed by:
 
- Hena Šehović
- Berina Juković
- Berin Žunić
 
## License
 
This project was developed for educational and portfolio purposes.
