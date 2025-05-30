import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ConnectToM365Form = (props: any) => {
    const { m365DialogOpen, setM365DialogOpen, connectToM365 } = props
    return(
        <Dialog open={m365DialogOpen} onOpenChange={setM365DialogOpen}>
            <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
                <DialogTitle>Connect Microsoft 365</DialogTitle>
                <DialogDescription>
                Enter your Microsoft 365 API credentials to retrieve security insights.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
                <div className="bg-blue-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-blue-800 mb-1">How to get these credentials</h3>
                <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                    <li>Register an application in Azure Active Directory</li>
                    <li>Grant the app API permissions for Microsoft Graph (SecurityEvents.Read.All, etc.)</li>
                    <li>Create a client secret for the application</li>
                    <li>Note your tenant's domain name (e.g., yourcompany.onmicrosoft.com)</li>
                </ul>
                </div>

                <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    <div>
                    <label htmlFor="tenantDomain" className="block text-sm font-medium mb-1">
                        Tenant Domain
                    </label>
                    <input
                        id="tenantDomain"
                        type="text"
                        className="w-full p-2 border rounded-md text-sm"
                        placeholder="yourcompany.onmicrosoft.com"
                    />
                    <p className="text-xs text-secondary-500 mt-1">Your Microsoft 365 tenant domain name</p>
                    </div>

                    <div>
                    <label htmlFor="tenantName" className="block text-sm font-medium mb-1">
                        Tenant Name
                    </label>
                    <input
                        id="tenantName"
                        type="text"
                        className="w-full p-2 border rounded-md text-sm"
                        placeholder="Your Company Name"
                    />
                    <p className="text-xs text-secondary-500 mt-1">A friendly name for this tenant</p>
                    </div>

                    <div>
                    <label htmlFor="clientId" className="block text-sm font-medium mb-1">
                        Client ID
                    </label>
                    <input
                        id="clientId"
                        type="text"
                        className="w-full p-2 border rounded-md text-sm"
                        placeholder="Enter your Azure App Registration Client ID"
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                        The Application (client) ID from your Azure app registration
                    </p>
                    </div>

                    <div>
                    <label htmlFor="clientSecret" className="block text-sm font-medium mb-1">
                        Client Secret
                    </label>
                    <input
                        id="clientSecret"
                        type="password"
                        className="w-full p-2 border rounded-md text-sm"
                        placeholder="Enter your client secret value"
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                        The client secret value (not the ID) from your Azure app
                    </p>
                    </div>
                </div>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setM365DialogOpen(false)}>
                Cancel
                </Button>
                <Button onClick={() => connectToM365()}>Connect</Button>
            </DialogFooter>
            </DialogContent>
      </Dialog>        
    )
}

export default ConnectToM365Form