const API_BASE_URL = "http://localhost:5000/api";

// Types
export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    phone_number: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    image?: string;
    description?: string;
    category?: string;
}

export interface OrderPayload {
    items: Array<{ id: string; quantity: number }>;
    deliveryInfo?: Record<string, any>;
    totalPrice?: number;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    name?: string;
    address?: string;
    deposited_cash: number;
    payment_method?: string;
    warning_count: number;
    phone_number: string;
    order_count: number;
}

export interface UpdateProfilePayload {
    name?: string;
    address?: string;
    deposited_cash?: number;
    payment_method?: string;
}

export interface EmployeeLoginPayload {
    email: string;
    password: string;
}

export interface EmployeeProfile {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    reputation_score: number;
}

export interface HireEmployeePayload {
    name: string;
    email: string;
    password: string;
    role: string;
}

const getAuthToken = (): string | null => localStorage.getItem("authToken");
const setAuthToken = (token: string | null) => {
    if (token) localStorage.setItem("authToken", token);
    else localStorage.removeItem("authToken");
};

const getEmployeeToken = (): string | null => localStorage.getItem("employeeToken");

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}/${endpoint.replace(/^\//, "")}`;

    // Use Headers to safely set fields
    const headers = new Headers(options.headers as HeadersInit);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    // Check for both customer and employee tokens
    const authToken = getAuthToken();
    const employeeToken = getEmployeeToken();
    
    // Determine which token to use based on the endpoint
    let tokenToUse = null;
    if (endpoint.includes('/employee/') || endpoint.includes('/manager/')) {
        // Employee-specific endpoints
        tokenToUse = employeeToken;
        console.log('Using employee token for endpoint:', endpoint);
    } else {
        // Customer-specific endpoints or general endpoints
        tokenToUse = authToken || employeeToken; // Fallback to employee token if no customer token
        console.log('Using customer token for endpoint:', endpoint, 'token available:', !!tokenToUse);
    }
    
    if (tokenToUse) {
        headers.set("Authorization", `Bearer ${tokenToUse}`);
    }

    const response = await fetch(url, { ...options, headers });

    // try to parse JSON body safely
    const text = await response.text();
    let body: any = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch (e) {
        body = text;
    }

    if (!response.ok) {
        const err = new Error(body && body.message ? body.message : `API request failed with status ${response.status}`);
        // attach status and body for callers that want more info
        (err as any).status = response.status;
        (err as any).body = body;
        throw err;
    }

    return body;
}


// API functions
export const api = {
    // Health
    healthCheck: () => fetchAPI("health"),

    // Auth
    register: async (payload: RegisterPayload) => {
        return fetchAPI("auth/register", {
            method: "POST",
            body: JSON.stringify({
                username: payload.username,
                email: payload.email,
                password: payload.password,
                phone_number: payload.phone_number,
            }),
        });
    },

    login: async (payload: LoginPayload) => {
        const res = await fetchAPI("auth/login", {
            method: "POST",
            body: JSON.stringify({ email: payload.email, password: payload.password }),
        });
        // expect { token: string } or similar
        if (res && res.token) {
            // Clear any employee tokens when customer logs in
            localStorage.removeItem('employeeToken');
            localStorage.removeItem('employeeData');
            setAuthToken(res.token);
        }
        return res;
    },

    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employeeData');
    },

    // Profile operations
    getProfile: () => fetchAPI("auth/profile"),

    updateProfile: (payload: UpdateProfilePayload) => fetchAPI("auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
    }),

    // Menu operations
    getMenu: (category?: string) => {
        const endpoint = category ? `menu?category=${encodeURIComponent(category)}` : "menu";
        return fetchAPI(endpoint);
    },

    getMenuItem: (itemId: string) => fetchAPI(`menu/${encodeURIComponent(itemId)}`),

    // Orders
    getOrders: () => fetchAPI("orders"),

    createOrder: async (order: OrderPayload) => {
        const result = await fetchAPI("orders", { method: "POST", body: JSON.stringify(order) });
        // After placing an order, fetch the latest profile to update order_count
        try {
            const profile = await fetchAPI("auth/profile");
            if (profile && profile.success && profile.user) {
                localStorage.setItem('user', JSON.stringify(profile.user));
            }
        } catch {}
        return result;
    },

    // Employee operations
    employeeLogin: async (email: string, password: string) => {
        const res = await fetchAPI("auth/employee/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        return res;
    },

    getEmployeeProfile: () => fetchAPI("auth/employee/profile"),

    // Manager operations
    getEmployees: () => fetchAPI("manager/employees"),
    hireEmployee: (payload: HireEmployeePayload) => fetchAPI("manager/employees", {
        method: "POST",
        body: JSON.stringify(payload),
    }),
    updateEmployee: (employeeId: number, action: string) => fetchAPI(`manager/employees/${employeeId}`, {
        method: "PUT",
        body: JSON.stringify({ action }),
    }),
    getAllCustomers: () => fetchAPI("manager/customers"),

    // Chef operations
    getChefDishes: () => fetchAPI("chef/dishes"),
    createDish: (dish: any) => fetchAPI("chef/dishes", {
        method: "POST",
        body: JSON.stringify(dish),
    }),
    updateDish: (dishId: number, dish: any) => fetchAPI(`chef/dishes/${dishId}`, {
        method: "PUT",
        body: JSON.stringify(dish),
    }),
    deleteDish: (dishId: number) => fetchAPI(`chef/dishes/${dishId}`, {
        method: "DELETE",
    }),

    // Delivery operations
    getAvailableOrders: () => fetchAPI("delivery/available-orders"),
    placeDeliveryBid: (orderId: number, bidAmount: number) => fetchAPI("delivery/bid", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId, bid_amount: bidAmount }),
    }),
    getDeliveryBids: () => fetchAPI("delivery/my-bids"),
    getDeliveryDeliveries: () => fetchAPI("delivery/my-deliveries"),
    updateDeliveryStatus: (orderId: number, status: string) => fetchAPI("delivery/update-status", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId, status }),
    }),
};
