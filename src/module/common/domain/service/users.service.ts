import { Injectable } from "@nestjs/common";
@Injectable()
export class UsersService {
    getAllUsers(){
        return [{id:1, name:"user1"}]
    }
    getUserById(id: number){
        return {id:1, name:"user1"}
    }
    createUser(user: any){
        return "User created"
    }
    updateUser(id: number, user: any){
        return "User updated"
    }
    deleteUser(id: number){
        return "User deleted"
    }
}

