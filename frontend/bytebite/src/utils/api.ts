const API_BASE_URL = "";

// Types
export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    phone_number: string; //wei
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
    chef_name?: string;
    rating?: number;
    is_vip?: boolean;
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
    created_at?: string;
}

export interface UpdateProfilePayload {
    name?: string;
    address?: string;
    deposited_cash?: number;
    payment_method?: string;
}

export interface HireEmployeePayload {
    name: string;
    email: string;
    password: string;
    role: string;
}

// Token helpers
const getAuthToken = (): string | null => localStorage.getItem("authToken");
const getEmployeeToken = (): string | null => localStorage.getItem("employeeToken");

const setAuthToken = (token: string | null) => {
    if (token) localStorage.setItem("authToken", token);
    else localStorage.removeItem("authToken");
};

export const isAuthenticated = (): boolean => {
    return getAuthToken() !== null || getEmployeeToken() !== null;
};

// Core fetch function
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}/api/${endpoint.replace(/^\//, "")}`;

    // Use Headers to safely set fields, wei
    const headers = new Headers(options.headers as HeadersInit);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const authToken = getAuthToken();
    const employeeToken = getEmployeeToken();

    let tokenToUse = null;
    
    // If the request path contains 'chef', 'manager', or 'delivery', prioritize using the employee token.
    if (endpoint.includes('chef') || endpoint.includes('manager') || endpoint.includes('delivery')) {
        tokenToUse = employeeToken;
    } else {
        // In other situations (such as orders, profile), the customer token is used. If there is no customer token but there is an employee token (for example, an employee testing an order), a combination of both can also be used.
        tokenToUse = authToken || employeeToken;
    }
    
    if (tokenToUse) {
        headers.set("Authorization", `Bearer ${tokenToUse}`);
    }

    const response = await fetch(url, { ...options, headers }); //wei
      
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
                phone_number: payload.phone_number 
            }), //wei
        });
    },

    login: async (payload: LoginPayload) => {
        const res = await fetchAPI("auth/login", {
            method: "POST",
            body: JSON.stringify({ email: payload.email, password: payload.password }),
        });
        // expect { token: string } or similar
        if (res && res.token) setAuthToken(res.token);
        return res;
    },

    logout: () => { //wei
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employeeData');
    }, //wei

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

    createOrder: (order: OrderPayload) => fetchAPI("orders", { method: "POST", body: JSON.stringify(order) }),
    
    // Reviews //wei
    createReview: (data: { order_id: number, chef_rating: number, dish_rating: number, delivery_rating: number,comment: string }) => {
        return fetchAPI("reviews", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
    // --- Forum Operations ---
    getForumPosts: () => {
        return fetchAPI("forum/posts");
    },

    createForumPost: (data: { title: string; content: string; category: string }) => {
        return fetchAPI("forum/posts", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    likeForumPost: (postId: string) => {
        return fetchAPI(`forum/posts/${postId}/like`, {
            method: "POST",
        });
    },

    getPostComments: (postId: string) => {
        return fetchAPI(`forum/posts/${postId}/comments`);
    },

    createComment: (postId: string, content: string) => {
        return fetchAPI(`forum/posts/${postId}/comments`, {
            method: "POST",
            body: JSON.stringify({ content }),
        });
    },

    // Chef Operations
    getChefReviews: () => {
        return fetchAPI("chef/reviews");
    },
    
    // Get the chef's orders.
    getChefOrders: () => {
        // fetchAPI internal logic will automatically detect paths containing "chef" and use employeeToken
        return fetchAPI("chef/orders"); 
    },

    // Update order status, wei
    updateOrderStatus: (orderId: number, status: string) => {
        return fetchAPI(`chef/orders/${orderId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        });
    },
    
    // Chef Dishes Management 
    getChefDishes: () => fetchAPI("chef/dishes"),
    createDish: (dish: any) => fetchAPI("chef/dishes", { method: "POST", body: JSON.stringify(dish) }),
    updateDish: (id: number, dish: any) => fetchAPI(`chef/dishes/${id}`, { method: "PUT", body: JSON.stringify(dish) }),
    deleteDish: (id: number) => fetchAPI(`chef/dishes/${id}`, { method: "DELETE" }),
    
    // Employee Auth
    employeeLogin: async (email: string, password: string) => {
        return fetchAPI("auth/employee/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        }); //wei
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


    // --- Manager: Employee Management ---
    // Update basic info (Name, Email, Role)
    updateEmployeeInfo: (employeeId: number, data: any) => {
        return fetchAPI(`manager/employees/${employeeId}/info`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },
    // Delete employee
    deleteEmployee: (employeeId: number) => {
        return fetchAPI(`manager/employees/${employeeId}`, {
            method: "DELETE",
        });
    },

    // --- Manager: Customer Management ---
    // Update customer (Balance, Info, Blacklist)
    updateCustomerManager: (customerId: number, data: any) => {
        return fetchAPI(`manager/customers/${customerId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },
    // Delete customer
    deleteCustomerManager: (customerId: number) => {
        return fetchAPI(`manager/customers/${customerId}`, {
            method: "DELETE",
        });
    },

    getFinancialLogs: () => {
        return fetchAPI("manager/financials");
    },

    // Delivery operations (Added for Bidding System)
    getAvailableOrders: () => {
        // fetchAPI will automatically use employeeToken because path contains 'delivery'
        return fetchAPI("delivery/available-orders");
    },

    placeDeliveryBid: (orderId: number, bidAmount: number) => {
        return fetchAPI("delivery/bid", {
            method: "POST",
            body: JSON.stringify({ order_id: orderId, bid_amount: bidAmount }),
        });
    },

    getDeliveryBids: () => {
        return fetchAPI("delivery/my-bids");
    },

    getDeliveryDeliveries: () => {
        return fetchAPI("delivery/my-deliveries");
    },

    updateDeliveryStatus: (orderId: number, status: string) => {
        return fetchAPI("delivery/update-status", {
            method: "POST",
            body: JSON.stringify({ order_id: orderId, status: status }),
        });
    },
    getManagerBiddings: () => {
        return fetchAPI("manager/biddings");
    },
    
    // Manually assign order (End bidding)
    managerAssignOrder: (data: { bidding_id: number, employee_id: number, memo: string }) => {
        return fetchAPI("manager/assign", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
    
    // Helper: Get list of delivery staff (for manual assignment dropdown)
    getDeliveryStaff: () => {
        // We can reuse getEmployees but filter in frontend, or make a new endpoint. 
        // For now, let's reuse getEmployees and filter by role 'Delivery' in frontend.
        return fetchAPI("manager/employees");
    },

<<<<<<< Updated upstream
    sendChatMessage: (message: string) => {
        return fetchAPI("chat", {
            method: "POST",
            body: JSON.stringify({ message }),
        });
    },

    searchMenuByImage: (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        // Note: fetchAPI wrapper might set 'Content-Type': 'application/json' by default
        // For FormData, we must NOT set Content-Type header manually (browser sets it with boundary)
        // We need to bypass the default wrapper or adjust it. 
        // Assuming fetchAPI handles this, or we use direct fetch here for safety:
        
        const token = localStorage.getItem('authToken');
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        // DO NOT set Content-Type for FormData

        return fetch('http://127.0.0.1:5000/api/menu/search-by-image', {
            method: 'POST',
            headers: headers,
            body: formData
        }).then(res => res.json());
    },
    rateChatMessage: (question: string, answer: string, rating: number) => {
        return fetchAPI("chat/rate", {
            method: "POST",
            body: JSON.stringify({ question, answer, rating }),
        });
    },

    getKnowledgeBase: () => {
        return fetchAPI("manager/kb", {
            method: "GET",
        });
    },

    addKnowledgeEntry: (question: string, answer: string) => {
        return fetchAPI("manager/kb", {
            method: "POST",
            body: JSON.stringify({ question, answer }),
        });
    },


=======
    // Forum operations
    getForumPosts: () => fetchAPI("forum/posts"),
    createForumPost: (post: any) => fetchAPI("forum/posts", { method: "POST", body: JSON.stringify(post) }),
    getPostComments: (postId: string) => fetchAPI(`forum/posts/${postId}/comments`),
    createComment: (postId: string, comment: any) => fetchAPI(`forum/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(comment) }),
    reportForumContent: (report: any) => fetchAPI("forum/reports", { method: "POST", body: JSON.stringify(report) }),
    getForumReports: () => fetchAPI("manager/forum-reports"),
    updateReportStatus: (reportId: number, status: string) => fetchAPI(`manager/forum-reports/${reportId}`, { method: "PUT", body: JSON.stringify({ status }) }),

    // Notification endpoints
    getUserNotifications: () => fetchAPI("user/notifications"),
    markNotificationRead: (notificationId: number) => fetchAPI(`user/notifications/${notificationId}/read`, { method: "PUT" }),
>>>>>>> Stashed changes

    // Public endpoints for home page
    getRecommendations: () => fetchAPI("recommendations"),
    getFeaturedChefs: () => fetchAPI("chefs/featured"),
    getRecentOrders: () => fetchAPI("orders"),
    getOrderDetails: (orderId: number) => fetchAPI(`orders/${orderId}`),
};