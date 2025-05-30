import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';


const CreateCompanyForm = (props: any) => {
    const {form, createDialogOpen, setCreateDialogOpen, onSubmit, createCompanyMutation} = props
    return (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogTrigger asChild>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Company
        </Button>
        </DialogTrigger>
        <DialogContent>
        <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>Add a new company to monitor and manage its cybersecurity.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                    )}
                />
            <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                    <Input placeholder="Technology" {...field} />
                    </FormControl>
                    <FormDescription>The industry sector this company operates in</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>The company's website URL (optional)</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />

            <DialogFooter>
                <Button type="submit" disabled={createCompanyMutation.isPending}>
                {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                </Button>
            </DialogFooter>
            </form>
        </Form>
        </DialogContent>
    </Dialog>
    )
}

export default CreateCompanyForm